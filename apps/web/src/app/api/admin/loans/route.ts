import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { BillStatus } from '@prisma/client-postgres';

/**
 * GET /api/admin/loans
 *
 * Returns loan (bill) data for admin loan management page.
 * Maps bills to "loans" for admin display purposes.
 */

export interface LoanData {
  id: string;
  billId: string;
  borrower: string;
  borrowerShort: string;
  merchant: string;
  merchantShort: string;
  amount: string;
  amountRaw: string;
  orderId: string;
  status: 'active' | 'created' | 'repaid' | 'liquidated';
  createdAt: string;
  paidAt: string | null;
  repaidAt: string | null;
  txHash: string;
}

export interface LoansResponse {
  loans: LoanData[];
  stats: {
    totalActiveLoans: number;
    totalValueLocked: string;
    totalRepaid: number;
    totalCreated: number;
  };
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: any = {};

    if (status !== 'all') {
      const statusMap: Record<string, BillStatus> = {
        active: BillStatus.PAID,
        created: BillStatus.CREATED,
        repaid: BillStatus.REPAID,
        liquidated: BillStatus.LIQUIDATED,
      };
      if (statusMap[status]) {
        where.status = statusMap[status];
      }
    }

    if (search) {
      where.OR = [
        { user: { contains: search, mode: 'insensitive' } },
        { merchant: { contains: search, mode: 'insensitive' } },
        { orderId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch loans with pagination
    const [loans, total, activeCount, repaidCount, createdCount, activeAmount] = await Promise.all([
      prismaPostgres.parsedBill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prismaPostgres.parsedBill.count({ where }),
      prismaPostgres.parsedBill.count({ where: { status: BillStatus.PAID } }),
      prismaPostgres.parsedBill.count({ where: { status: BillStatus.REPAID } }),
      prismaPostgres.parsedBill.count({ where: { status: BillStatus.CREATED } }),
      prismaPostgres.parsedBill.aggregate({
        where: { status: BillStatus.PAID },
        _sum: { amount: true },
      }),
    ]);

    // Format helper
    const formatAmount = (amount: bigint): string => {
      const num = Number(amount) / 1e7;
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const shortenAddress = (addr: string): string =>
      `${addr.slice(0, 4)}...${addr.slice(-4)}`;

    // Map to response format
    const statusDisplayMap: Record<BillStatus, LoanData['status']> = {
      [BillStatus.PAID]: 'active',
      [BillStatus.CREATED]: 'created',
      [BillStatus.REPAID]: 'repaid',
      [BillStatus.LIQUIDATED]: 'liquidated',
    };

    const loanData: LoanData[] = loans.map((loan) => ({
      id: loan.id,
      billId: loan.billId.toString(),
      borrower: loan.user,
      borrowerShort: shortenAddress(loan.user),
      merchant: loan.merchant,
      merchantShort: shortenAddress(loan.merchant),
      amount: formatAmount(loan.amount),
      amountRaw: loan.amount.toString(),
      orderId: loan.orderId,
      status: statusDisplayMap[loan.status],
      createdAt: loan.createdAt.toISOString(),
      paidAt: loan.paidAt?.toISOString() || null,
      repaidAt: loan.repaidAt?.toISOString() || null,
      txHash: loan.txHash,
    }));

    const response: LoansResponse = {
      loans: loanData,
      stats: {
        totalActiveLoans: activeCount,
        totalValueLocked: formatAmount(activeAmount._sum.amount || 0n),
        totalRepaid: repaidCount,
        totalCreated: createdCount,
      },
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Loans] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}
