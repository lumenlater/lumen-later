import { NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { BillStatus } from '@prisma/client-postgres';

/**
 * GET /api/admin/dashboard
 *
 * Returns dashboard statistics for admin panel.
 * Data sources:
 * - parsed_bills: Active loans, bill counts
 * - parsed_merchants: Merchant counts
 * - contract_events: Recent activity
 */

export interface DashboardStats {
  // Core metrics
  tvl: string;
  totalBorrowed: string;
  utilizationRate: number;

  // Loan metrics
  activeLoans: number;
  totalLoans: number;
  overdueLoans: number;

  // Merchant metrics
  totalMerchants: number;
  pendingMerchants: number;

  // Revenue (calculated from fees)
  totalRevenue: string;

  // Recent activity
  recentActivity: RecentActivity[];
}

export interface RecentActivity {
  id: string;
  type: 'bill_created' | 'bill_paid' | 'bill_repaid' | 'merchant_enrolled' | 'deposit' | 'withdraw';
  title: string;
  description: string;
  timestamp: string;
  txHash?: string;
}

export async function GET() {
  try {
    // Fetch bill statistics
    const [
      totalBillsCount,
      activeBillsCount,
      repaidBillsCount,
      totalBillsAmount,
      activeBillsAmount,
      merchantsCount,
      recentBills,
      recentMerchants,
    ] = await Promise.all([
      // Total bills count
      prismaPostgres.parsedBill.count(),

      // Active loans (PAID status - not yet repaid)
      prismaPostgres.parsedBill.count({
        where: { status: BillStatus.PAID },
      }),

      // Repaid bills count
      prismaPostgres.parsedBill.count({
        where: { status: BillStatus.REPAID },
      }),

      // Total bills amount (all bills)
      prismaPostgres.parsedBill.aggregate({
        _sum: { amount: true },
      }),

      // Active bills amount (borrowed amount)
      prismaPostgres.parsedBill.aggregate({
        where: { status: BillStatus.PAID },
        _sum: { amount: true },
      }),

      // Total merchants
      prismaPostgres.parsedMerchant.count({
        where: { isActive: true },
      }),

      // Recent bills for activity
      prismaPostgres.parsedBill.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          billId: true,
          user: true,
          merchant: true,
          amount: true,
          status: true,
          createdAt: true,
          paidAt: true,
          repaidAt: true,
          txHash: true,
        },
      }),

      // Recent merchants for activity
      prismaPostgres.parsedMerchant.findMany({
        orderBy: { enrolledAt: 'desc' },
        take: 3,
        select: {
          id: true,
          address: true,
          enrolledAt: true,
          txHash: true,
        },
      }),
    ]);

    // Calculate metrics
    const totalBorrowedAmount = activeBillsAmount._sum.amount || 0n;
    const totalVolumeAmount = totalBillsAmount._sum.amount || 0n;

    // Format amounts (7 decimals for USDC)
    const formatAmount = (amount: bigint): string => {
      const num = Number(amount) / 1e7;
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Calculate revenue (simplified: 5% fee on repaid bills)
    const feeRate = 0.05;
    const repaidAmount = await prismaPostgres.parsedBill.aggregate({
      where: { status: BillStatus.REPAID },
      _sum: { amountRepaid: true },
    });
    const totalFees = Number(repaidAmount._sum.amountRepaid || 0n) * feeRate / 1e7;

    // Build recent activity from bills and merchants
    const recentActivity: RecentActivity[] = [];

    // Add bill activities
    for (const bill of recentBills) {
      const userShort = `${bill.user.slice(0, 4)}...${bill.user.slice(-4)}`;
      const amount = formatAmount(bill.amount);

      if (bill.status === BillStatus.CREATED) {
        recentActivity.push({
          id: bill.id,
          type: 'bill_created',
          title: 'New bill created',
          description: `Bill #${bill.billId} for ${amount} USDC`,
          timestamp: bill.createdAt.toISOString(),
          txHash: bill.txHash,
        });
      } else if (bill.status === BillStatus.PAID) {
        recentActivity.push({
          id: bill.id,
          type: 'bill_paid',
          title: 'BNPL Payment',
          description: `${userShort} used BNPL for ${amount} USDC`,
          timestamp: (bill.paidAt || bill.createdAt).toISOString(),
          txHash: bill.txHash,
        });
      } else if (bill.status === BillStatus.REPAID) {
        recentActivity.push({
          id: bill.id,
          type: 'bill_repaid',
          title: 'Loan repaid',
          description: `${userShort} repaid ${amount} USDC`,
          timestamp: (bill.repaidAt || bill.createdAt).toISOString(),
          txHash: bill.txHash,
        });
      }
    }

    // Add merchant activities
    for (const merchant of recentMerchants) {
      const addressShort = `${merchant.address.slice(0, 4)}...${merchant.address.slice(-4)}`;
      recentActivity.push({
        id: merchant.id,
        type: 'merchant_enrolled',
        title: 'Merchant enrolled',
        description: `${addressShort} joined as merchant`,
        timestamp: merchant.enrolledAt.toISOString(),
        txHash: merchant.txHash,
      });
    }

    // Sort by timestamp descending
    recentActivity.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Calculate utilization rate (borrowed / total volume)
    const utilizationRate = totalVolumeAmount > 0n
      ? (Number(totalBorrowedAmount) / Number(totalVolumeAmount)) * 100
      : 0;

    const stats: DashboardStats = {
      tvl: formatAmount(totalVolumeAmount),
      totalBorrowed: formatAmount(totalBorrowedAmount),
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      activeLoans: activeBillsCount,
      totalLoans: totalBillsCount,
      overdueLoans: 0, // TODO: Calculate based on due dates when available
      totalMerchants: merchantsCount,
      pendingMerchants: 0, // TODO: Get from MongoDB merchant applications
      totalRevenue: totalFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      recentActivity: recentActivity.slice(0, 5),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Admin Dashboard] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
