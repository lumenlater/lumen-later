/**
 * Protocol Stats Hook
 *
 * Fetches protocol statistics from the protocol-stats API endpoint.
 * Data is captured hourly by the cron job and includes:
 * - LP Pool metrics (TVL, APY, utilization)
 * - Volume and fees
 * - Bills statistics
 * - Historical data for graphs
 */

import { useQuery } from '@tanstack/react-query';

export interface ProtocolSnapshot {
  id: string;
  createdAt: string;

  // Liquidity Pool
  poolTvl: string | null;
  poolUtilization: number | null;
  poolApyDaily: number | null;
  poolApyMonthly: number | null;
  poolApyTotal: number | null;

  // Bills
  billsTotal: number;
  billsCreated: number;
  billsPaid: number;
  billsRepaid: number;
  billsLiquidated: number;

  // Volume (stroops as string)
  volume24h: string;
  volume7d: string;
  volume30d: string;
  volumeTotal: string;

  // Fees (stroops as string)
  fees24h: string;
  fees7d: string;
  fees30d: string;
  feesTotal: string;
  feesToLp: string;
  feesToTreasury: string;
  feesToInsurance: string;

  // Participants
  uniqueUsers: number;
  uniqueMerchants: number;
  activeUsers24h: number;
  activeMerchants24h: number;

  // Health
  totalOutstanding: string | null;
  avgBillAmount: string | null;
  repaymentRate: number | null;
  defaultRate: number | null;

  // Ledger
  latestLedger: string | null;
}

export interface ProtocolStatsResponse {
  success: boolean;
  current: ProtocolSnapshot | null;
  history?: ProtocolSnapshot[];
  meta?: {
    historyPeriod: string;
    historyCount: number;
  };
  message?: string;
}

type Period = '24h' | '7d' | '30d' | '90d' | 'all';

interface UseProtocolStatsOptions {
  includeHistory?: boolean;
  period?: Period;
  refetchInterval?: number;
}

// Convert stroops to display amount (7 decimals)
export const formatStroops = (stroops: string | null | undefined): string => {
  if (!stroops) return '0.00';
  const num = Number(stroops) / 1e7;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Convert stroops to bigint
export const stroopsToBigInt = (stroops: string | null | undefined): bigint => {
  if (!stroops) return 0n;
  return BigInt(stroops);
};

export function useProtocolStats(options: UseProtocolStatsOptions = {}) {
  const {
    includeHistory = false,
    period = '7d',
    refetchInterval = 60 * 1000, // 1 minute default
  } = options;

  const query = useQuery({
    queryKey: ['protocolStats', includeHistory, period],
    queryFn: async (): Promise<ProtocolStatsResponse> => {
      const params = new URLSearchParams();
      if (includeHistory) {
        params.set('history', 'true');
        params.set('period', period);
      }

      const url = `/api/protocol-stats${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch protocol stats');
      }

      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
    refetchOnWindowFocus: true,
  });

  const current = query.data?.current;

  return {
    // Raw data
    data: query.data,
    current,
    history: query.data?.history,

    // Status
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Computed values (convenience getters)
    poolTvl: current?.poolTvl ? stroopsToBigInt(current.poolTvl) : null,
    poolApyDaily: current?.poolApyDaily ?? null,
    poolApyMonthly: current?.poolApyMonthly ?? null,
    poolApyTotal: current?.poolApyTotal ?? null,
    poolUtilization: current?.poolUtilization ?? null,

    // Volume
    volume24h: current?.volume24h ? stroopsToBigInt(current.volume24h) : null,
    volume7d: current?.volume7d ? stroopsToBigInt(current.volume7d) : null,
    volume30d: current?.volume30d ? stroopsToBigInt(current.volume30d) : null,
    volumeTotal: current?.volumeTotal ? stroopsToBigInt(current.volumeTotal) : null,

    // Fees
    feesTotal: current?.feesTotal ? stroopsToBigInt(current.feesTotal) : null,
    feesToLp: current?.feesToLp ? stroopsToBigInt(current.feesToLp) : null,

    // Bills
    billsTotal: current?.billsTotal ?? 0,
    billsPaid: current?.billsPaid ?? 0,
    billsRepaid: current?.billsRepaid ?? 0,

    // Participants
    uniqueUsers: current?.uniqueUsers ?? 0,
    uniqueMerchants: current?.uniqueMerchants ?? 0,

    // Health
    totalOutstanding: current?.totalOutstanding ? stroopsToBigInt(current.totalOutstanding) : null,
    repaymentRate: current?.repaymentRate ?? null,
    defaultRate: current?.defaultRate ?? null,

    // Formatted values
    formatted: {
      poolTvl: formatStroops(current?.poolTvl),
      volume24h: formatStroops(current?.volume24h),
      volume7d: formatStroops(current?.volume7d),
      volumeTotal: formatStroops(current?.volumeTotal),
      feesTotal: formatStroops(current?.feesTotal),
      feesToLp: formatStroops(current?.feesToLp),
      totalOutstanding: formatStroops(current?.totalOutstanding),
    },
  };
}

// Export query key for invalidation
export const protocolStatsKeys = {
  all: ['protocolStats'] as const,
  current: () => [...protocolStatsKeys.all, false] as const,
  history: (period: Period) => [...protocolStatsKeys.all, true, period] as const,
};
