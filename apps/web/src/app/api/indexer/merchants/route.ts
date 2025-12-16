import { NextRequest, NextResponse } from 'next/server';
import { eventIndexer } from '@/services/event-indexer.service';
import { MerchantApplicationService } from '@/services/merchant-application.service';
import {
  buildMerchantListFromEvents,
  ContractEvent,
  IndexedMerchant,
} from '@/lib/event-parser';
import CONTRACT_IDS from '@/config/contracts';

// Extended merchant with DB info
export interface MerchantWithInfo extends IndexedMerchant {
  businessInfo?: {
    legalName: string;
    tradingName: string;
    category: string;
    monthlyVolume: number;
  };
  contactInfo?: {
    email: string;
    phone: string;
  };
  dbStatus?: string;
  riskScore?: number | null;
}

const merchantService = new MerchantApplicationService();

/**
 * GET /api/indexer/merchants
 *
 * Get list of merchants from indexed blockchain events.
 * Builds merchant list from m_enroll and m_status events.
 * Enriches with business info from MongoDB.
 *
 * Query Parameters:
 * - status: Filter by status (Pending, Approved, Rejected, Suspended)
 *
 * Response:
 * - merchants: Array of MerchantWithInfo
 * - total: Total count
 * - stats: { pending, approved, rejected, suspended }
 */
export async function GET(request: NextRequest) {
  try {
    if (!eventIndexer.isConfigured()) {
      return NextResponse.json(
        { error: 'PostgreSQL not configured. Set POSTGRES_URL in .env' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');

    // Get all BNPL_CORE events (we need m_enroll and m_status)
    const result = await eventIndexer.getEvents({
      contractId: CONTRACT_IDS.BNPL_CORE,
      limit: 1000, // Get all merchant events
    });

    // Convert to ContractEvent format for the parser
    const events: ContractEvent[] = result.events.map(e => ({
      id: e.id,
      contractId: e.contractId,
      contractName: e.contractName,
      type: e.type,
      topics: e.topics,
      data: e.data,
      ledgerSequence: e.ledgerSequence.toString(),
      ledgerClosedAt: e.ledgerClosedAt.toISOString(),
      transactionHash: e.transactionHash,
      transactionSuccessful: e.transactionSuccessful,
    }));

    // Build merchant list from events
    const indexedMerchants = buildMerchantListFromEvents(events);

    // Enrich with MongoDB business info
    const merchantsWithInfo: MerchantWithInfo[] = await Promise.all(
      indexedMerchants.map(async (merchant) => {
        const enriched: MerchantWithInfo = { ...merchant };

        // Try to get business info from MongoDB using merchantInfoId
        if (merchant.merchantInfoId) {
          try {
            const application = await merchantService.getApplicationById(merchant.merchantInfoId);
            if (application) {
              const bizInfo = application.businessInfo as any;
              const contactInfo = application.contactInfo as any;

              enriched.businessInfo = {
                legalName: bizInfo?.legalName || '',
                tradingName: bizInfo?.tradingName || '',
                category: bizInfo?.category || '',
                monthlyVolume: bizInfo?.monthlyVolume || 0,
              };

              if (contactInfo?.primaryContact) {
                enriched.contactInfo = {
                  email: contactInfo.primaryContact.email || '',
                  phone: contactInfo.primaryContact.phone || '',
                };
              }

              enriched.dbStatus = application.status;
              enriched.riskScore = application.riskScore;
            }
          } catch (error) {
            console.error(`Failed to fetch merchant info for ${merchant.merchantInfoId}:`, error);
          }
        }

        return enriched;
      })
    );

    // Calculate stats before filtering
    const stats = {
      pending: merchantsWithInfo.filter(m => m.status === 'Pending').length,
      approved: merchantsWithInfo.filter(m => m.status === 'Approved').length,
      rejected: merchantsWithInfo.filter(m => m.status === 'Rejected').length,
      suspended: merchantsWithInfo.filter(m => m.status === 'Suspended').length,
    };

    // Apply status filter if provided
    let merchants = merchantsWithInfo;
    if (statusFilter) {
      merchants = merchantsWithInfo.filter(m => m.status === statusFilter);
    }

    return NextResponse.json({
      merchants,
      total: merchants.length,
      stats,
    });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merchants' },
      { status: 500 }
    );
  }
}
