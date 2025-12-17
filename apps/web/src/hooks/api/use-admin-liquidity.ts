/**
 * Admin Liquidity Hook
 *
 * Fetches liquidity pool stats for admin panel.
 * Combines indexed event data with real-time contract data.
 */

import { useQuery } from '@tanstack/react-query';
import type { LiquidityStats } from '@/app/api/admin/liquidity/route';

// Re-export types
export type { LiquidityStats };

// Query keys
export const adminLiquidityKeys = {
  all: ['admin', 'liquidity'] as const,
  stats: () => [...adminLiquidityKeys.all, 'stats'] as const,
};

interface UseAdminLiquidityReturn {
  stats: LiquidityStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminLiquidity(): UseAdminLiquidityReturn {
  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: adminLiquidityKeys.stats(),
    queryFn: async (): Promise<LiquidityStats> => {
      const response = await fetch('/api/admin/liquidity');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch liquidity stats');
      }

      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const refetch = async () => {
    await queryRefetch();
  };

  return {
    stats: data || null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
