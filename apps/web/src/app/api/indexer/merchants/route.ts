import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { MerchantApplicationService } from '@/services/merchant-application.service';

// Extended merchant with DB info
export interface MerchantWithInfo {
  address: string;
  contractId: string;
  isActive: boolean;
  enrolledAt: string;
  txHash: string;
  ledgerSequence: string;
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
 * Get list of merchants from parsed_merchants table (populated by Goldsky webhook).
 * Enriches with business info from MongoDB.
 *
 * Query Parameters:
 * - status: Filter by active status (active, inactive, all)
 * - address: Filter by specific merchant address
 *
 * Response:
 * - merchants: Array of MerchantWithInfo
 * - total: Total count
 * - stats: { active, inactive }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const addressFilter = searchParams.get('address');

    // Build where clause
    const where: any = {};
    if (statusFilter === 'active') where.isActive = true;
    if (statusFilter === 'inactive') where.isActive = false;
    if (addressFilter) where.address = addressFilter;

    // Get merchants from parsed_merchants table
    const [merchants, total] = await Promise.all([
      prismaPostgres.parsedMerchant.findMany({
        where,
        orderBy: { enrolledAt: 'desc' },
      }),
      prismaPostgres.parsedMerchant.count({ where }),
    ]);

    // Calculate stats (before enrichment)
    const allMerchants = await prismaPostgres.parsedMerchant.findMany();
    const stats = {
      active: allMerchants.filter(m => m.isActive).length,
      inactive: allMerchants.filter(m => !m.isActive).length,
      total: allMerchants.length,
    };

    // Enrich with MongoDB business info
    const merchantsWithInfo: MerchantWithInfo[] = await Promise.all(
      merchants.map(async (merchant) => {
        const enriched: MerchantWithInfo = {
          address: merchant.address,
          contractId: merchant.contractId,
          isActive: merchant.isActive,
          enrolledAt: merchant.enrolledAt.toISOString(),
          txHash: merchant.txHash,
          ledgerSequence: merchant.ledgerSequence.toString(),
        };

        // Try to get business info from MongoDB by applicant address
        try {
          const application = await merchantService.getApplicationByApplicant(merchant.address, merchant.contractId);
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
          console.error(`Failed to fetch merchant info for ${merchant.address}:`, error);
        }

        return enriched;
      })
    );

    return NextResponse.json({
      merchants: merchantsWithInfo,
      total,
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
