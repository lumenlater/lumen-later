import { NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { BillStatus } from '@prisma/client-postgres';

/**
 * GET /api/admin/liquidity
 *
 * Returns liquidity pool stats for admin dashboard.
 * Aggregates revenue and utilization data from indexed events.
 */

export interface LiquidityStats {
  // Revenue metrics (from indexed bills)
  totalRevenue: string;
  revenueThisMonth: string;
  pendingRevenue: string;

  // Pool utilization (from indexed bills)
  totalBorrowed: string;
  totalRepaid: string;
  activeLoanCount: number;
  repaidLoanCount: number;

  // LP holder approximation (unique depositors - would need deposit events)
  estimatedHolders: number;

  // Recent activity
  recentDeposits: DepositActivity[];
  recentWithdraws: WithdrawActivity[];
}

export interface DepositActivity {
  id: string;
  address: string;
  addressShort: string;
  amount: string;
  timestamp: string;
  txHash: string;
}

export interface WithdrawActivity {
  id: string;
  address: string;
  addressShort: string;
  amount: string;
  timestamp: string;
  txHash: string;
}

export async function GET() {
  try {
    // Calculate fee rate (3% protocol fee on repayments)
    const FEE_RATE = 0.03;

    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate data from bills
    const [
      totalRepaidBills,
      monthlyRepaidBills,
      activeBills,
      allRepaidBillsSum,
      activeBillsSum,
    ] = await Promise.all([
      // Total repaid bills (for revenue calculation)
      prismaPostgres.parsedBill.aggregate({
        where: { status: BillStatus.REPAID },
        _sum: { amountRepaid: true },
        _count: true,
      }),
      // Monthly repaid bills
      prismaPostgres.parsedBill.aggregate({
        where: {
          status: BillStatus.REPAID,
          repaidAt: { gte: monthStart },
        },
        _sum: { amountRepaid: true },
      }),
      // Active bills (currently borrowed)
      prismaPostgres.parsedBill.count({
        where: { status: BillStatus.PAID },
      }),
      // Total amount repaid
      prismaPostgres.parsedBill.aggregate({
        where: { status: BillStatus.REPAID },
        _sum: { amount: true },
      }),
      // Total amount currently borrowed (active loans)
      prismaPostgres.parsedBill.aggregate({
        where: { status: BillStatus.PAID },
        _sum: { amount: true },
      }),
    ]);

    // Format helper (7 decimals for Stellar)
    const formatAmount = (amount: bigint | null): string => {
      if (!amount) return '0.00';
      const num = Number(amount) / 1e7;
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const shortenAddress = (addr: string): string =>
      `${addr.slice(0, 4)}...${addr.slice(-4)}`;

    // Calculate revenue (fees from repaid amount - original amount)
    // Revenue = amountRepaid - amount (the difference is fees)
    const totalRepaidAmount = totalRepaidBills._sum.amountRepaid || 0n;
    const totalOriginalAmount = allRepaidBillsSum._sum.amount || 0n;
    const totalRevenue = totalRepaidAmount > totalOriginalAmount
      ? totalRepaidAmount - totalOriginalAmount
      : 0n;

    const monthlyRepaidAmount = monthlyRepaidBills._sum.amountRepaid || 0n;
    // Estimate monthly revenue as ~3% of monthly repayments
    const monthlyRevenue = BigInt(Math.floor(Number(monthlyRepaidAmount) * FEE_RATE));

    // Pending revenue from active loans (potential fees)
    const activeBorrowedAmount = activeBillsSum._sum.amount || 0n;
    const pendingRevenue = BigInt(Math.floor(Number(activeBorrowedAmount) * FEE_RATE));

    // Note: We don't have deposit/withdraw events indexed yet
    // These would come from LP token contract events when indexed
    const recentDeposits: DepositActivity[] = [];
    const recentWithdraws: WithdrawActivity[] = [];

    // Estimate holders (unique borrowers as proxy - actual LP holders need deposit events)
    const uniqueBorrowers = await prismaPostgres.parsedBill.findMany({
      select: { user: true },
      distinct: ['user'],
    });

    const response: LiquidityStats = {
      // Revenue metrics
      totalRevenue: formatAmount(totalRevenue),
      revenueThisMonth: formatAmount(monthlyRevenue),
      pendingRevenue: formatAmount(pendingRevenue),

      // Pool utilization
      totalBorrowed: formatAmount(activeBorrowedAmount),
      totalRepaid: formatAmount(totalOriginalAmount),
      activeLoanCount: activeBills,
      repaidLoanCount: totalRepaidBills._count,

      // Holders (placeholder - needs deposit event indexing)
      estimatedHolders: uniqueBorrowers.length,

      // Activity (placeholder - needs LP token event indexing)
      recentDeposits,
      recentWithdraws,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Liquidity] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch liquidity stats' },
      { status: 500 }
    );
  }
}
