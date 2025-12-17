import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { BillStatus } from '@prisma/client-postgres';

/**
 * GET /api/indexer/bills
 *
 * Query indexed bills from parsed_bills table (populated by Goldsky webhook).
 *
 * Query Parameters:
 * - user: Filter by user address
 * - merchant: Filter by merchant address
 * - status: Filter by status (CREATED, PAID, REPAID, LIQUIDATED)
 * - billId: Filter by specific bill ID
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const user = searchParams.get('user') || undefined;
    const merchant = searchParams.get('merchant') || undefined;
    const status = searchParams.get('status') as BillStatus | undefined;
    const billId = searchParams.get('billId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    if (user) where.user = user;
    if (merchant) where.merchant = merchant;
    if (status) where.status = status;
    if (billId) where.billId = BigInt(billId);

    const [bills, total] = await Promise.all([
      prismaPostgres.parsedBill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prismaPostgres.parsedBill.count({ where }),
    ]);

    // Serialize BigInt values
    const serializedBills = bills.map(bill => ({
      id: bill.id,
      billId: bill.billId.toString(),
      contractId: bill.contractId,
      merchant: bill.merchant,
      user: bill.user,
      amount: bill.amount.toString(),
      orderId: bill.orderId,
      status: bill.status,
      createdAt: bill.createdAt.toISOString(),
      updatedAt: bill.updatedAt.toISOString(),
      paidAt: bill.paidAt?.toISOString() || null,
      repaidAt: bill.repaidAt?.toISOString() || null,
      liquidatedAt: bill.liquidatedAt?.toISOString() || null,
      loanId: bill.loanId?.toString() || null,
      txHash: bill.txHash,
      ledgerSequence: bill.ledgerSequence.toString(),
    }));

    // Calculate stats
    const stats = {
      total,
      byStatus: {
        created: bills.filter(b => b.status === 'CREATED').length,
        paid: bills.filter(b => b.status === 'PAID').length,
        repaid: bills.filter(b => b.status === 'REPAID').length,
        liquidated: bills.filter(b => b.status === 'LIQUIDATED').length,
      },
    };

    return NextResponse.json({
      bills: serializedBills,
      total,
      limit,
      offset,
      stats,
    });
  } catch (error) {
    console.error('Error fetching indexed bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}
