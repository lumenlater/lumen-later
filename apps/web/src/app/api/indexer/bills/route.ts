import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';

/**
 * GET /api/indexer/bills
 *
 * Get bills from indexed data.
 * Query params:
 *   - user: Filter by user address
 *   - merchant: Filter by merchant address
 *   - status: Filter by status (CREATED, PAID, REPAID, LIQUIDATED)
 *   - limit: Max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const user = searchParams.get('user');
    const merchant = searchParams.get('merchant');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (user) where.user = user;
    if (merchant) where.merchant = merchant;
    if (status) where.status = status.toUpperCase();

    const bills = await prismaPostgres.parsedBill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    // Serialize BigInt values
    const serializedBills = bills.map(bill => ({
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
    }));

    return NextResponse.json({
      bills: serializedBills,
      total: serializedBills.length,
    });
  } catch (error) {
    console.error('[Indexer Bills] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}
