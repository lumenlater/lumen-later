import { NextRequest, NextResponse } from 'next/server';
import { eventIndexer } from '@/services/event-indexer.service';
import { MerchantApplicationService } from '@/services/merchant-application.service';
import {
  buildMerchantListFromEvents,
  ContractEvent,
  parseTopics,
} from '@/lib/event-parser';
import CONTRACT_IDS from '@/config/contracts';

const merchantService = new MerchantApplicationService();

/**
 * GET /api/indexer/merchants/[address]
 *
 * Get detailed merchant info by address.
 * Combines blockchain event data with MongoDB application data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Merchant address is required' },
        { status: 400 }
      );
    }

    if (!eventIndexer.isConfigured()) {
      return NextResponse.json(
        { error: 'PostgreSQL not configured' },
        { status: 503 }
      );
    }

    // Get all BNPL_CORE events
    const result = await eventIndexer.getEvents({
      contractId: CONTRACT_IDS.BNPL_CORE,
      limit: 1000,
    });

    // Convert to ContractEvent format
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

    // Build merchant list and find the specific merchant
    const merchants = buildMerchantListFromEvents(events);
    const merchant = merchants.find(m => m.address === address);

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found on blockchain' },
        { status: 404 }
      );
    }

    // Get merchant's event history
    const merchantEvents = events.filter(e => {
      const { action } = parseTopics(e.topics);
      if (action === 'm_enroll' || action === 'm_status') {
        // Check if this event is for this merchant
        try {
          const data = JSON.parse(e.data || '{}');
          if (data.map) {
            for (const item of data.map) {
              if (item.key?.symbol === 'merchant' && item.val?.address === address) {
                return true;
              }
            }
          }
        } catch {
          return false;
        }
      }
      return false;
    }).map(e => ({
      id: e.id,
      action: parseTopics(e.topics).action,
      timestamp: e.ledgerClosedAt,
      ledgerSequence: e.ledgerSequence,
      transactionHash: e.transactionHash,
    }));

    // Get full application data from MongoDB
    let applicationData = null;
    if (merchant.merchantInfoId) {
      try {
        const application = await merchantService.getApplicationById(merchant.merchantInfoId);
        if (application) {
          applicationData = {
            id: application.id,
            status: application.status,
            submittedAt: application.submittedAt,
            reviewedAt: application.reviewedAt,
            reviewedBy: application.reviewedBy,
            rejectionReason: application.rejectionReason,
            riskScore: application.riskScore,
            businessInfo: application.businessInfo,
            contactInfo: application.contactInfo,
            documents: application.documents,
            bankingInfo: application.bankingInfo,
            isBlockchainCommitted: application.isBlockchainCommitted,
            blockchainTxHash: application.blockchainTxHash,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
          };
        }
      } catch (error) {
        console.error('Failed to fetch application data:', error);
      }
    }

    return NextResponse.json({
      merchant: {
        ...merchant,
        events: merchantEvents,
        application: applicationData,
      },
    });
  } catch (error) {
    console.error('Error fetching merchant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merchant' },
      { status: 500 }
    );
  }
}
