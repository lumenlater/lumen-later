/**
 * Admin Loans Hook
 *
 * Fetches and manages loan data for admin panel.
 */

import { useQuery } from '@tanstack/react-query';
import type { LoanData, LoansResponse } from '@/app/api/admin/loans/route';

// Re-export types
export type { LoanData, LoansResponse };

// Query keys
export const adminLoansKeys = {
  all: ['admin', 'loans'] as const,
  list: (params: LoansQueryParams) => [...adminLoansKeys.all, 'list', params] as const,
};

export interface LoansQueryParams {
  page?: number;
  pageSize?: number;
  status?: 'all' | 'active' | 'created' | 'repaid' | 'liquidated';
  search?: string;
}

interface UseAdminLoansReturn {
  loans: LoanData[];
  stats: LoansResponse['stats'] | null;
  pagination: LoansResponse['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminLoans(params: LoansQueryParams = {}): UseAdminLoansReturn {
  const { page = 1, pageSize = 20, status = 'all', search = '' } = params;

  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: adminLoansKeys.list({ page, pageSize, status, search }),
    queryFn: async (): Promise<LoansResponse> => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        status,
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/loans?${queryParams}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch loans');
      }

      return response.json();
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const refetch = async () => {
    await queryRefetch();
  };

  return {
    loans: data?.loans || [],
    stats: data?.stats || null,
    pagination: data?.pagination || null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
