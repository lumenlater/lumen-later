import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { prisma } from '@/lib/prisma';
import CONTRACT_IDS from '@/config/contracts';

/**
 * Get merchant payout from USDC transfer in the same transaction
 */
async function getMerchantPayout(txHash: string, merchantAddress: string): Promise<string | null> {
  try {
    const transferEvents = await prismaPostgres.contractEvent.findMany({
      where: {
        transactionHash: txHash,
        contractId: CONTRACT_IDS.USDC_TOKEN,
      },
    });

    for (const event of transferEvents) {
      if (!event.topics) continue;
      try {
        const topics = JSON.parse(event.topics);
        if (topics[0]?.symbol === 'transfer' && topics[2]?.address === merchantAddress) {
          if (event.data) {
            const data = JSON.parse(event.data);
            if (data.i128) return data.i128;
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/indexer/bills/[billId]
 *
 * Get a single bill by billId from indexed data.
 * Includes merchant payout from USDC transfers for paid bills.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;

    if (!billId) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    const bill = await prismaPostgres.parsedBill.findUnique({
      where: { billId: BigInt(billId) },
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Get merchant payout for paid bills
    let merchantPayout: string | null = null;
    if (bill.status === 'PAID' || bill.status === 'REPAID' || bill.status === 'LIQUIDATED') {
      merchantPayout = await getMerchantPayout(bill.txHash, bill.merchant);
    }

    // Get off-chain data from MongoDB (description, merchantName)
    // orderId is the MongoDB _id used when creating the bill
    let offChainData: { description?: string; merchantName?: string } | null = null;
    if (bill.orderId) {
      try {
        const mongoBill = await prisma.bill.findUnique({
          where: { id: bill.orderId },
          select: { description: true, merchantName: true },
        });
        if (mongoBill) {
          offChainData = mongoBill;
        }
      } catch {
        // MongoDB lookup failed, continue without off-chain data
      }
    }

    // Serialize BigInt values
    const serializedBill = {
      id: bill.id,
      billId: bill.billId.toString(),
      contractId: bill.contractId,
      merchant: bill.merchant,
      user: bill.user,
      amount: bill.amount.toString(),
      amountRepaid: bill.amountRepaid?.toString() || null,
      merchantPayout,
      orderId: bill.orderId,
      status: bill.status,
      createdAt: bill.createdAt.toISOString(),
      paidAt: bill.paidAt?.toISOString() || null,
      repaidAt: bill.repaidAt?.toISOString() || null,
      liquidatedAt: bill.liquidatedAt?.toISOString() || null,
      txHash: bill.txHash,
      ledgerSequence: bill.ledgerSequence.toString(),
      // Off-chain data from MongoDB
      description: offChainData?.description || null,
      merchantName: offChainData?.merchantName || null,
    };

    return NextResponse.json({ bill: serializedBill });
  } catch (error) {
    console.error('[Indexer Bill] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    );
  }
}
