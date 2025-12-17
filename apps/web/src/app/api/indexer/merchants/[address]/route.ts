import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { MerchantApplicationService } from '@/services/merchant-application.service';

const merchantService = new MerchantApplicationService();

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

    // Calculate bill stats
    const billStats = {
      total: bills.length,
      totalVolume: bills.reduce((sum, b) => sum + Number(b.amount), 0),
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
