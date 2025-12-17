import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';

/**
 * GET /api/indexer/bills/[billId]
 *
 * Get a single bill by billId from indexed data.
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

    // Serialize BigInt values
    const serializedBill = {
      id: bill.id,
      billId: bill.billId.toString(),
      contractId: bill.contractId,
      merchant: bill.merchant,
      user: bill.user,
      amount: bill.amount.toString(),
      amountRepaid: bill.amountRepaid?.toString() || null,
      orderId: bill.orderId,
      status: bill.status,
      createdAt: bill.createdAt.toISOString(),
      paidAt: bill.paidAt?.toISOString() || null,
      repaidAt: bill.repaidAt?.toISOString() || null,
      liquidatedAt: bill.liquidatedAt?.toISOString() || null,
      txHash: bill.txHash,
      ledgerSequence: bill.ledgerSequence.toString(),
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
