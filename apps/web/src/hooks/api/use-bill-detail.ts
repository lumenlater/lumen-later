/**
 * Bill Detail Hook
 *
 * Fetches indexed bill data and provides on-chain verification
 */

import { useQuery } from '@tanstack/react-query';
import { useBnplClient } from '../web3/use-bnpl-client';
import { useState, useCallback } from 'react';

export interface IndexedBillDetail {
  id: string;
  billId: string;
  contractId: string;
  merchant: string;
  user: string;
  amount: string;
  amountRepaid: string | null;
  merchantPayout: string | null;
  orderId: string;
  status: 'CREATED' | 'PAID' | 'REPAID' | 'LIQUIDATED';
  createdAt: string;
  paidAt: string | null;
  repaidAt: string | null;
  liquidatedAt: string | null;
  txHash: string;
  ledgerSequence: string;
  // Off-chain data from MongoDB
  description: string | null;
  merchantName: string | null;
}

export interface OnChainBill {
  id: string;
  merchant: string;
  user: string;
  principal: string;
  order_id: string;
  status: string;
  created_at: string;
  paid_at: string;
}

interface BillDetailResponse {
  bill: IndexedBillDetail;
}

export const billDetailKeys = {
  all: ['bill-detail'] as const,
  detail: (billId: string) => [...billDetailKeys.all, billId] as const,
};

export function useBillDetail(billId: string | null) {
  const { client } = useBnplClient();
  const [onChainData, setOnChainData] = useState<OnChainBill | null>(null);
  const [isLoadingOnChain, setIsLoadingOnChain] = useState(false);
  const [onChainError, setOnChainError] = useState<string | null>(null);

  // Fetch indexed data
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<BillDetailResponse>({
    queryKey: billDetailKeys.detail(billId || ''),
    queryFn: async () => {
      if (!billId) throw new Error('Bill ID required');
      const res = await fetch(`/api/indexer/bills/${billId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch bill');
      }
      return res.json();
    },
    enabled: !!billId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch on-chain data for verification
  const verifyOnChain = useCallback(async () => {
    if (!client || !billId) return;

    setIsLoadingOnChain(true);
    setOnChainError(null);

    try {
      const tx = await client.get_bill({ bill_id: BigInt(billId) });
      const bill = tx.result;

      if (bill) {
        // Map on-chain status tag to string
        const statusTag = bill.status?.tag || 'None';

        setOnChainData({
          id: bill.id.toString(),
          merchant: bill.merchant,
          user: bill.user,
          principal: bill.principal.toString(),
          order_id: bill.order_id,
          status: statusTag,
          created_at: bill.created_at.toString(),
          paid_at: bill.paid_at.toString(),
        });
      }
    } catch (err) {
      setOnChainError(err instanceof Error ? err.message : 'Failed to fetch on-chain data');
    } finally {
      setIsLoadingOnChain(false);
    }
  }, [client, billId]);

  return {
    bill: data?.bill || null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,

    // On-chain verification
    onChainData,
    isLoadingOnChain,
    onChainError,
    verifyOnChain,
  };
}
