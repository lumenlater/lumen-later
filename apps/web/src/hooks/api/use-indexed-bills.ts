/**
 * Indexed Bills Hook
 *
 * Fetches bill data from the indexer API instead of RPC calls.
 * Much faster and cheaper than direct contract calls.
 */

import { useQuery } from '@tanstack/react-query';

export interface IndexedBill {
  id: string;
  billId: string;
  contractId: string;
  merchant: string;
  user: string;
  amount: string;
  amountRepaid: string | null;
  orderId: string;
  status: 'CREATED' | 'PAID' | 'REPAID' | 'LIQUIDATED';
  createdAt: string;
  paidAt: string | null;
  repaidAt: string | null;
  liquidatedAt: string | null;
  txHash: string;
  ledgerSequence: string;
}

// Query keys
export const indexedBillsKeys = {
  all: ['indexed', 'bills'] as const,
  byUser: (user: string) => [...indexedBillsKeys.all, 'user', user] as const,
  byMerchant: (merchant: string) => [...indexedBillsKeys.all, 'merchant', merchant] as const,
  single: (billId: string) => [...indexedBillsKeys.all, 'single', billId] as const,
};

interface UseUserBillsOptions {
  enabled?: boolean;
}

/**
 * Fetch bills for a specific user
 */
export function useUserBills(user: string | null, options?: UseUserBillsOptions) {
  return useQuery({
    queryKey: indexedBillsKeys.byUser(user || ''),
    queryFn: async (): Promise<IndexedBill[]> => {
      if (!user) return [];

      const response = await fetch(`/api/indexer/bills?user=${user}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch user bills');
      }

      const data = await response.json();
      return data.bills;
    },
    enabled: !!user && (options?.enabled !== false),
    staleTime: 10 * 1000, // 10 seconds - bills can update frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch bills for a specific merchant
 */
export function useMerchantBills(merchant: string | null, options?: UseUserBillsOptions) {
  return useQuery({
    queryKey: indexedBillsKeys.byMerchant(merchant || ''),
    queryFn: async (): Promise<IndexedBill[]> => {
      if (!merchant) return [];

      const response = await fetch(`/api/indexer/bills?merchant=${merchant}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch merchant bills');
      }

      const data = await response.json();
      return data.bills;
    },
    enabled: !!merchant && (options?.enabled !== false),
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single bill by ID
 */
export function useBill(billId: string | null, options?: UseUserBillsOptions) {
  return useQuery({
    queryKey: indexedBillsKeys.single(billId || ''),
    queryFn: async (): Promise<IndexedBill | null> => {
      if (!billId) return null;

      const response = await fetch(`/api/indexer/bills/${billId}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch bill');
      }

      const data = await response.json();
      return data.bill;
    },
    enabled: !!billId && (options?.enabled !== false),
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
