import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { MerchantApplicationService } from '@/services/merchant-application.service';
import CONTRACT_IDS from '@/config/contracts';

const merchantService = new MerchantApplicationService();

/**
 * Bulk fetch USDC transfer amounts to merchant from contract_events
 * Returns map of txHash -> payout amount
 */
async function getMerchantPayoutsBulk(
  txHashes: string[],
  merchantAddress: string
): Promise<Map<string, bigint>> {
  const payouts = new Map<string, bigint>();

  if (txHashes.length === 0) return payouts;

  try {
    // Single query for all USDC transfers in these transactions
    const transferEvents = await prismaPostgres.contractEvent.findMany({
      where: {
        transactionHash: { in: txHashes },
        contractId: CONTRACT_IDS.USDC_TOKEN,
      },
    });

    for (const event of transferEvents) {
      if (!event.topics) continue;

      try {
        const topics = JSON.parse(event.topics);
        // Transfer event: topics[0] = "transfer", topics[1] = from, topics[2] = to
        if (topics[0]?.symbol === 'transfer' && topics[2]?.address === merchantAddress) {
          if (event.data) {
            const data = JSON.parse(event.data);
            if (data.i128) {
              payouts.set(event.transactionHash, BigInt(data.i128));
            }
          }
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error('Error fetching merchant payouts:', error);
  }

  return payouts;
}

/**
 * GET /api/indexer/merchants/[address]
 *
 * Get detailed merchant info by address from parsed_merchants table.
 * Combines indexed blockchain data with MongoDB application data.
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

    // Get merchant from parsed_merchants table
    const merchant = await prismaPostgres.parsedMerchant.findUnique({
      where: { address },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Get merchant's bills from parsed_bills table
    const bills = await prismaPostgres.parsedBill.findMany({
      where: { merchant: address },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get full application data from MongoDB
    let applicationData = null;
    try {
      const application = await merchantService.getApplicationByApplicant(address, merchant.contractId);
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

    // Serialize BigInt values
    const serializedMerchant = {
      id: merchant.id,
      address: merchant.address,
      contractId: merchant.contractId,
      isActive: merchant.isActive,
      enrolledAt: merchant.enrolledAt.toISOString(),
      txHash: merchant.txHash,
      ledgerSequence: merchant.ledgerSequence.toString(),
      createdAt: merchant.createdAt.toISOString(),
      updatedAt: merchant.updatedAt.toISOString(),
    };

    const serializedBills = bills.map(bill => ({
      id: bill.id,
      billId: bill.billId.toString(),
      user: bill.user,
      amount: bill.amount.toString(),
      orderId: bill.orderId,
      status: bill.status,
      createdAt: bill.createdAt.toISOString(),
      paidAt: bill.paidAt?.toISOString() || null,
      repaidAt: bill.repaidAt?.toISOString() || null,
      liquidatedAt: bill.liquidatedAt?.toISOString() || null,
      txHash: bill.txHash,
    }));

    // Get actual merchant payouts from USDC transfer events for paid bills
    const paidBills = bills.filter(b =>
      b.status === 'PAID' || b.status === 'REPAID' || b.status === 'LIQUIDATED'
    );

    // Bulk fetch payouts - single query for all transactions
    const paidTxHashes = paidBills.map(b => b.txHash);
    const payoutsMap = await getMerchantPayoutsBulk(paidTxHashes, address);

    // Calculate volumes
    const totalVolume = bills.reduce((sum, b) => sum + Number(b.amount), 0);
    const paidVolume = paidBills.reduce((sum, b) => sum + Number(b.amount), 0);

    // Actual revenue from USDC transfers (fallback to 98.5% if not found)
    const actualRevenue = paidBills.reduce((sum, bill) => {
      const payout = payoutsMap.get(bill.txHash);
      if (payout !== undefined) {
        return sum + Number(payout);
      }
      // Fallback: estimate at 98.5% (1.5% fee)
      return sum + Math.floor(Number(bill.amount) * 0.985);
    }, 0);

    // Volume by status
    const volumeByStatus = {
      created: bills.filter(b => b.status === 'CREATED').reduce((sum, b) => sum + Number(b.amount), 0),
      paid: bills.filter(b => b.status === 'PAID').reduce((sum, b) => sum + Number(b.amount), 0),
      repaid: bills.filter(b => b.status === 'REPAID').reduce((sum, b) => sum + Number(b.amount), 0),
      liquidated: bills.filter(b => b.status === 'LIQUIDATED').reduce((sum, b) => sum + Number(b.amount), 0),
    };

    const billStats = {
      total: bills.length,
      totalVolume,
      paidVolume,
      actualRevenue,
      feesDeducted: paidVolume - actualRevenue,
      volumeByStatus,
      byStatus: {
        created: bills.filter(b => b.status === 'CREATED').length,
        paid: bills.filter(b => b.status === 'PAID').length,
        repaid: bills.filter(b => b.status === 'REPAID').length,
        liquidated: bills.filter(b => b.status === 'LIQUIDATED').length,
      },
    };

    return NextResponse.json({
      merchant: {
        ...serializedMerchant,
        bills: serializedBills,
        billStats,
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
