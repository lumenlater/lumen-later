/**
 * Hook for fetching bill events from indexed database (parsed_bills table)
 *
 * Previously fetched directly from Soroban RPC, now uses Goldsky-indexed data.
 */

import { useQuery } from '@tanstack/react-query';
import { Config } from '@/constants/config';

interface IndexedBill {
  id: string;
  billId: string;
  contractId: string;
  merchant: string;
  user: string;
  amount: string;
  orderId: string;
  status: 'CREATED' | 'PAID' | 'REPAID' | 'LIQUIDATED';
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  repaidAt: string | null;
  liquidatedAt: string | null;
  loanId: string | null;
  txHash: string;
  ledgerSequence: string;
}

interface BillsResponse {
  bills: IndexedBill[];
  total: number;
  limit: number;
  offset: number;
  stats: {
    total: number;
    byStatus: {
      created: number;
      paid: number;
      repaid: number;
      liquidated: number;
    };
  };
}

// Legacy BillEvent interface for backward compatibility
export interface BillEvent {
  bill_id: number;
  merchant: string;
  user: string;
  amount: number;
  order_id: string;
  created_at: Date;
  ledger: number;
  txHash: string;
  status?: string;
}

// Convert IndexedBill to BillEvent for backward compatibility
function toBillEvent(bill: IndexedBill): BillEvent {
  return {
    bill_id: parseInt(bill.billId),
    merchant: bill.merchant,
    user: bill.user,
    amount: Number(bill.amount) / (10 ** Config.USDC_DECIMALS),
    order_id: bill.orderId,
    created_at: new Date(bill.createdAt),
    ledger: parseInt(bill.ledgerSequence),
    txHash: bill.txHash,
    status: bill.status,
  };
}

export function useBillEvents() {
  // Get bills by user from indexed database
  const useBillEventsByUser = (userAddress?: string | null) => {
    return useQuery({
      queryKey: ['billEvents', 'user', userAddress],
      queryFn: async (): Promise<BillEvent[]> => {
        if (!userAddress) {
          throw new Error('User address required');
        }

        try {
          const params = new URLSearchParams({
            user: userAddress,
            limit: '100',
          });

          const response = await fetch(`/api/indexer/bills?${params}`);

          if (!response.ok) {
            console.error('Failed to fetch user bills:', response.statusText);
            return [];
          }

          const data: BillsResponse = await response.json();
          return data.bills.map(toBillEvent);
        } catch (error) {
          console.error('Error fetching user bill events:', error);
          return [];
        }
      },
      enabled: !!userAddress,
      retry: 2,
      staleTime: 30000, // 30 seconds
    });
  };

  // Get bills by merchant from indexed database
  const useBillEventsByMerchant = (merchantAddress?: string | null) => {
    return useQuery({
      queryKey: ['billEvents', 'merchant', merchantAddress],
      queryFn: async (): Promise<BillEvent[]> => {
        if (!merchantAddress) {
          throw new Error('Merchant address required');
        }

        try {
          const params = new URLSearchParams({
            merchant: merchantAddress,
            limit: '100',
          });

          const response = await fetch(`/api/indexer/bills?${params}`);

          if (!response.ok) {
            console.error('Failed to fetch merchant bills:', response.statusText);
            return [];
          }

          const data: BillsResponse = await response.json();
          return data.bills.map(toBillEvent);
        } catch (error) {
          console.error('Error fetching merchant bill events:', error);
          return [];
        }
      },
      enabled: !!merchantAddress,
      retry: 2,
      staleTime: 30000,
    });
  };

  // Get all bill events from indexed database
  const useAllBillEvents = () => {
    return useQuery({
      queryKey: ['billEvents', 'all'],
      queryFn: async (): Promise<BillEvent[]> => {
        try {
          const params = new URLSearchParams({
            limit: '100',
          });

          const response = await fetch(`/api/indexer/bills?${params}`);

          if (!response.ok) {
            console.error('Failed to fetch all bills:', response.statusText);
            return [];
          }

          const data: BillsResponse = await response.json();
          return data.bills.map(toBillEvent);
        } catch (error) {
          console.error('Error fetching all bill events:', error);
          return [];
        }
      },
      retry: 2,
      staleTime: 30000,
    });
  };

  // Get bills by status
  const useBillEventsByStatus = (status: 'CREATED' | 'PAID' | 'REPAID' | 'LIQUIDATED') => {
    return useQuery({
      queryKey: ['billEvents', 'status', status],
      queryFn: async (): Promise<BillEvent[]> => {
        try {
          const params = new URLSearchParams({
            status,
            limit: '100',
          });

          const response = await fetch(`/api/indexer/bills?${params}`);

          if (!response.ok) {
            console.error('Failed to fetch bills by status:', response.statusText);
            return [];
          }

          const data: BillsResponse = await response.json();
          return data.bills.map(toBillEvent);
        } catch (error) {
          console.error('Error fetching bill events by status:', error);
          return [];
        }
      },
      retry: 2,
      staleTime: 30000,
    });
  };

  // Get raw indexed bills (without conversion)
  const useIndexedBills = (filters?: { user?: string; merchant?: string; status?: string }) => {
    return useQuery({
      queryKey: ['indexedBills', filters],
      queryFn: async (): Promise<BillsResponse> => {
        try {
          const params = new URLSearchParams();
          if (filters?.user) params.set('user', filters.user);
          if (filters?.merchant) params.set('merchant', filters.merchant);
          if (filters?.status) params.set('status', filters.status);
          params.set('limit', '100');

          const response = await fetch(`/api/indexer/bills?${params}`);

          if (!response.ok) {
            throw new Error('Failed to fetch indexed bills');
          }

          return await response.json();
        } catch (error) {
          console.error('Error fetching indexed bills:', error);
          throw error;
        }
      },
      retry: 2,
      staleTime: 30000,
    });
  };

  return {
    useBillEventsByUser,
    useBillEventsByMerchant,
    useAllBillEvents,
    useBillEventsByStatus,
    useIndexedBills,
  };
}
