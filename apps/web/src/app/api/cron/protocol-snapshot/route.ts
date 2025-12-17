import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { Prisma } from '@prisma/client-postgres';
import * as LPTokenClient from '@lumenlater/lp-token-client';
import CONTRACT_IDS from '@/config/contracts';

/**
 * POST /api/cron/protocol-snapshot
 *
 * Hourly cron job to capture protocol metrics snapshot.
 * Called by Vercel Cron.
 *
 * Security: Validates CRON_SECRET header in production.
 */

const CRON_SECRET = process.env.CRON_SECRET;
const STELLAR_RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';

// Fee structure constants (matching smart contract)
const MERCHANT_FEE_RATE = 0.015; // 1.5%
const LP_FEE_SHARE = 0.70; // 70% of fees to LP
const TREASURY_FEE_SHARE = 0.20; // 20% to Treasury
const INSURANCE_FEE_SHARE = 0.10; // 10% to Insurance

/**
 * Fetch LP Pool state from Stellar RPC
 * Returns real-time TVL, exchange rate, and utilization
 */
async function fetchLPPoolState(): Promise<{
  totalUnderlying: bigint;
  totalBorrowed: bigint;
  exchangeRate: bigint;
  totalSupply: bigint;
  utilizationRatio: number;
  poolTvl: bigint;
} | null> {
  try {
    // Initialize LP Token client for read-only operations
    const lpClient = new LPTokenClient.Client({
      ...LPTokenClient.networks.testnet,
      contractId: CONTRACT_IDS.LP_TOKEN,
      rpcUrl: STELLAR_RPC_URL,
      // No publicKey needed for read operations
    });

    // Fetch LP pool metrics in parallel
    const [
      totalUnderlyingTx,
      totalBorrowedTx,
      exchangeRateTx,
      totalSupplyTx,
      utilizationRatioTx,
    ] = await Promise.all([
      lpClient.total_underlying(),
      lpClient.total_borrowed(),
      lpClient.exchange_rate(),
      lpClient.total_supply(),
      lpClient.utilization_ratio(),
    ]);

    const totalUnderlying = totalUnderlyingTx.result || 0n;
    const totalBorrowed = BigInt(totalBorrowedTx.result || 0n);
    const exchangeRate = BigInt(exchangeRateTx.result || 0n);
    const totalSupply = totalSupplyTx.result || 0n;
    const utilizationRatio = totalSupplyTx.result ? Number(utilizationRatioTx.result) / 100 : 0; // basis points to %

    // TVL = total assets managed by the pool (held + borrowed)
    const poolTvl = totalUnderlying + totalBorrowed;

    console.log('[Cron] LP Pool State:', {
      totalUnderlying: totalUnderlying.toString(),
      totalBorrowed: totalBorrowed.toString(),
      exchangeRate: exchangeRate.toString(),
      totalSupply: totalSupply.toString(),
      utilizationRatio,
      poolTvl: poolTvl.toString(),
    });

    return {
      totalUnderlying,
      totalBorrowed,
      exchangeRate,
      totalSupply,
      utilizationRatio,
      poolTvl,
    };
  } catch (error) {
    console.error('[Cron] Error fetching LP pool state:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate cron secret in production
    if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ===== LP Pool State (from Stellar RPC) =====
    const lpPoolState = await fetchLPPoolState();

    // ===== Bills Stats =====
    const billStats = await prismaPostgres.parsedBill.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
    });

    const billsByStatus = {
      CREATED: 0,
      PAID: 0,
      REPAID: 0,
      LIQUIDATED: 0,
    };
    let totalVolume = BigInt(0);

    for (const stat of billStats) {
      billsByStatus[stat.status] = stat._count._all;
      // Volume = sum of all non-CREATED bills (actual transactions)
      if (stat.status !== 'CREATED' && stat._sum.amount) {
        totalVolume += stat._sum.amount;
      }
    }

    const billsTotal = Object.values(billsByStatus).reduce((a, b) => a + b, 0);

    // ===== Volume by Time Period =====
    const [vol24hResult, vol7dResult, vol30dResult] = await Promise.all([
      prismaPostgres.parsedBill.aggregate({
        where: {
          status: { not: 'CREATED' },
          paidAt: { gte: oneDayAgo },
        },
        _sum: { amount: true },
      }),
      prismaPostgres.parsedBill.aggregate({
        where: {
          status: { not: 'CREATED' },
          paidAt: { gte: sevenDaysAgo },
        },
        _sum: { amount: true },
      }),
      prismaPostgres.parsedBill.aggregate({
        where: {
          status: { not: 'CREATED' },
          paidAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),
    ]);

    const volume24h = vol24hResult._sum.amount || BigInt(0);
    const volume7d = vol7dResult._sum.amount || BigInt(0);
    const volume30d = vol30dResult._sum.amount || BigInt(0);

    // ===== Fee Calculations =====
    // Fees are calculated from volume (1.5% merchant fee)
    const feesTotal = BigInt(Math.floor(Number(totalVolume) * MERCHANT_FEE_RATE));
    const fees24h = BigInt(Math.floor(Number(volume24h) * MERCHANT_FEE_RATE));
    const fees7d = BigInt(Math.floor(Number(volume7d) * MERCHANT_FEE_RATE));
    const fees30d = BigInt(Math.floor(Number(volume30d) * MERCHANT_FEE_RATE));

    // Fee distribution
    const feesToLp = BigInt(Math.floor(Number(feesTotal) * LP_FEE_SHARE));
    const feesToTreasury = BigInt(Math.floor(Number(feesTotal) * TREASURY_FEE_SHARE));
    const feesToInsurance = BigInt(Math.floor(Number(feesTotal) * INSURANCE_FEE_SHARE));

    // ===== Participant Stats =====
    const uniqueUsers = await prismaPostgres.parsedBill.findMany({
      select: { user: true },
      distinct: ['user'],
    });

    const uniqueMerchants = await prismaPostgres.parsedMerchant.count();

    // Active users/merchants in last 24h
    const activeUsers24h = await prismaPostgres.parsedBill.findMany({
      where: {
        OR: [
          { createdAt: { gte: oneDayAgo } },
          { paidAt: { gte: oneDayAgo } },
          { repaidAt: { gte: oneDayAgo } },
        ],
      },
      select: { user: true },
      distinct: ['user'],
    });

    const activeMerchants24h = await prismaPostgres.parsedBill.findMany({
      where: {
        OR: [
          { createdAt: { gte: oneDayAgo } },
          { paidAt: { gte: oneDayAgo } },
        ],
      },
      select: { merchant: true },
      distinct: ['merchant'],
    });

    // ===== Health Metrics =====
    // Outstanding = sum of PAID bills (not yet repaid)
    const outstandingResult = await prismaPostgres.parsedBill.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    });
    const totalOutstanding = outstandingResult._sum.amount || BigInt(0);

    // Average bill amount
    const avgBillResult = await prismaPostgres.parsedBill.aggregate({
      where: { status: { not: 'CREATED' } },
      _avg: { amount: true },
    });
    const avgBillAmount = avgBillResult._avg.amount
      ? BigInt(Math.floor(Number(avgBillResult._avg.amount)))
      : null;

    // Repayment and default rates
    const completedBills = billsByStatus.REPAID + billsByStatus.LIQUIDATED;
    const repaymentRate = completedBills > 0
      ? new Prisma.Decimal((billsByStatus.REPAID / completedBills) * 100)
      : null;
    const defaultRate = completedBills > 0
      ? new Prisma.Decimal((billsByStatus.LIQUIDATED / completedBills) * 100)
      : null;

    // ===== APY Calculations =====
    // APY = (LP Fees / Pool TVL) * (365 / days) * 100
    // Using real TVL from LP Pool RPC calls

    let poolApyDaily: Prisma.Decimal | null = null;
    let poolApyMonthly: Prisma.Decimal | null = null;
    let poolApyTotal: Prisma.Decimal | null = null;

    // Use real TVL from LP pool, fallback to totalOutstanding if RPC fails
    const poolTvl = lpPoolState?.poolTvl || totalOutstanding;
    const tvl = Number(poolTvl);

    if (tvl > 0) {
      const lpFees24h = Number(fees24h) * LP_FEE_SHARE;
      const lpFees30d = Number(fees30d) * LP_FEE_SHARE;
      const lpFeesTotal = Number(feesToLp);

      // Daily APY (annualized from 24h)
      if (lpFees24h > 0) {
        poolApyDaily = new Prisma.Decimal((lpFees24h / tvl) * 365 * 100);
      }

      // Monthly APY (annualized from 30d)
      if (lpFees30d > 0) {
        poolApyMonthly = new Prisma.Decimal((lpFees30d / tvl) * (365 / 30) * 100);
      }

      // Total APY (actual cumulative)
      if (lpFeesTotal > 0) {
        // Estimate days since first bill
        const firstBill = await prismaPostgres.parsedBill.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        });
        if (firstBill) {
          const daysSinceStart = Math.max(
            1,
            (now.getTime() - firstBill.createdAt.getTime()) / (24 * 60 * 60 * 1000)
          );
          poolApyTotal = new Prisma.Decimal((lpFeesTotal / tvl) * (365 / daysSinceStart) * 100);
        }
      }
    }

    // Pool utilization from RPC (fallback to calculated value)
    const poolUtilization = lpPoolState
      ? new Prisma.Decimal(lpPoolState.utilizationRatio)
      : totalVolume > BigInt(0)
        ? new Prisma.Decimal((Number(totalOutstanding) / Number(totalVolume)) * 100)
        : null;

    // ===== Latest Ledger =====
    const latestEvent = await prismaPostgres.contractEvent.findFirst({
      orderBy: { ledgerSequence: 'desc' },
      select: { ledgerSequence: true },
    });

    // ===== Create Snapshot =====
    const snapshot = await prismaPostgres.protocolSnapshot.create({
      data: {
        // Liquidity Pool (using real TVL from RPC)
        poolTvl,
        poolUtilization,
        poolApyDaily,
        poolApyMonthly,
        poolApyTotal,

        // Bills
        billsTotal,
        billsCreated: billsByStatus.CREATED,
        billsPaid: billsByStatus.PAID,
        billsRepaid: billsByStatus.REPAID,
        billsLiquidated: billsByStatus.LIQUIDATED,

        // Volume
        volume24h,
        volume7d,
        volume30d,
        volumeTotal: totalVolume,

        // Fees
        fees24h,
        fees7d,
        fees30d,
        feesTotal,
        feesToLp,
        feesToTreasury,
        feesToInsurance,

        // Participants
        uniqueUsers: uniqueUsers.length,
        uniqueMerchants,
        activeUsers24h: activeUsers24h.length,
        activeMerchants24h: activeMerchants24h.length,

        // Health
        totalOutstanding,
        avgBillAmount,
        repaymentRate,
        defaultRate,

        // Ledger
        latestLedger: latestEvent?.ledgerSequence || null,
      },
    });

    console.log(`[Cron] Protocol snapshot created: ${snapshot.id}`);

    return NextResponse.json({
      success: true,
      snapshotId: snapshot.id,
      timestamp: snapshot.createdAt,
      summary: {
        billsTotal,
        volumeTotal: totalVolume.toString(),
        feesTotal: feesTotal.toString(),
        uniqueUsers: uniqueUsers.length,
        poolApyDaily: poolApyDaily?.toString() || null,
      },
      lpPool: lpPoolState ? {
        tvl: lpPoolState.poolTvl.toString(),
        totalUnderlying: lpPoolState.totalUnderlying.toString(),
        totalBorrowed: lpPoolState.totalBorrowed.toString(),
        exchangeRate: lpPoolState.exchangeRate.toString(),
        totalSupply: lpPoolState.totalSupply.toString(),
        utilizationRatio: lpPoolState.utilizationRatio,
      } : null,
    });
  } catch (error) {
    console.error('[Cron] Error creating protocol snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot', details: String(error) },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
