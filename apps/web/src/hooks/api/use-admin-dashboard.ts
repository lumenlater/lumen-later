/**
 * Admin Dashboard Hook
 *
 * Fetches and manages admin dashboard statistics.
 * Uses React Query for caching and automatic refetching.
 */

import { useQuery } from '@tanstack/react-query';
import type { DashboardStats, RecentActivity } from '@/app/api/admin/dashboard/route';

// Re-export types for convenience
export type { DashboardStats, RecentActivity };

// Query keys
export const adminDashboardKeys = {
  all: ['admin', 'dashboard'] as const,
  stats: () => [...adminDashboardKeys.all, 'stats'] as const,
};

interface UseAdminDashboardReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminDashboard(): UseAdminDashboardReturn {
  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: adminDashboardKeys.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      const response = await fetch('/api/admin/dashboard');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch dashboard stats');
      }

      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
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
