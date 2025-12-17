/**
 * BNPL Bill operations hook
 *
 * Reads: Uses indexer API (fast, no RPC cost)
 * Writes: Uses RPC (mutations require contract interaction)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBnplClient } from './use-bnpl-client';
import { BorrowingPower } from '@lumenlater/bnpl-core-client';
import { indexedBillsKeys } from '../api/use-indexed-bills';

export function useBnplBill() {
  const { client, publicKey, toStroops, signAndSendTx, queryKeys } = useBnplClient();
  const queryClient = useQueryClient();

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async ({ 
      user,
      amount, 
      orderId, 
    }: { 
      user: string;
      amount: string; 
      orderId?: string;
    }) => {
      if (!client || !publicKey) throw new Error('Not connected');

      const amountStroops = toStroops(amount);
      // If no order ID is provided, generate a random one
      const orderIdToUse = orderId || (Date.now().toString());
      
      const tx = await client.create_bill({ 
        merchant: publicKey, // Use connected wallet as merchant
        user: user, // Optional user parameter
        amount: amountStroops, 
        order_id: orderIdToUse,
      });
      
      const result = await signAndSendTx(tx);
      const billId = result.result;
      return billId.toString();
    },
    onSuccess: () => {
      // Invalidate both RPC and indexer caches
      queryClient.invalidateQueries({ queryKey: queryKeys.bills(publicKey || '') });
      queryClient.invalidateQueries({ queryKey: indexedBillsKeys.all });
    },
  });

  // Pay bill mutation
  const payBillMutation = useMutation({
    mutationFn: async ({ 
      billId, 
    }: { 
      billId: string; 
    }) => {
      if (!client || !publicKey) throw new Error('Not connected');

      // For BNPL payment
      const tx = await client.pay_bill_bnpl({ 
        bill_id: BigInt(billId),
      });
        
      const result = await signAndSendTx(tx);
      const loanId = result.result;
      return loanId.toString();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: indexedBillsKeys.all });
    },
  });

  // Repay bill mutation
  // NOTE: Caller must ensure USDC approval is done before calling this
  const repayBillMutation = useMutation({
    mutationFn: async ({
      billId,
    }: {
      billId: string;
    }) => {
      if (!client || !publicKey) throw new Error('Not connected');

      const tx = await client.repay_bill({
        bill_id: BigInt(billId),
      });

      await signAndSendTx(tx);
      return billId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: indexedBillsKeys.all });
    },
  });

  // Get borrowing power (keep RPC - needs real-time calculation from contract)
  const getUserBorrowingPower = async (user: string): Promise<BorrowingPower | null> => {
    if (!client) return null;

    try {
      const tx = await client.get_user_borrowing_power({ user });
      const borrowingPowerData = tx.result;

      if (!borrowingPowerData) return null;

      return borrowingPowerData;
    } catch (error) {
      return null;
    }
  };

  return {
    // Queries (use useUserBills/useBill from use-indexed-bills.ts for bill reads)
    getUserBorrowingPower,

    // Mutations
    createBill: (user: string, amount: string, orderId?: string) =>
      createBillMutation.mutateAsync({user, amount, orderId }),
    payBill: (billId: string) =>
      payBillMutation.mutateAsync({ billId }),
    repayBill: (billId: string) =>
      repayBillMutation.mutateAsync({ billId }),

    // Loading states
    isLoading: createBillMutation.isPending || payBillMutation.isPending || repayBillMutation.isPending,
    error: createBillMutation.error || payBillMutation.error || repayBillMutation.error,
  };
}