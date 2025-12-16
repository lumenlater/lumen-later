/**
 * BNPL Bill operations hook
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBnplClient } from './use-bnpl-client';
import { Bill, BorrowingPower } from '@lumenlater/bnpl-core-client';

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
    onSuccess: (billId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bills(publicKey || '') });
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
    },
  });

  // Get bill helper
  const getBill = async (billId: string): Promise<Bill | null> => {
    if (!client) return null;

    try {
      // Check if billId is valid
      if (!billId || billId === 'undefined') {
        return null;
      }
      
      const tx = await client.get_bill({ bill_id: BigInt(billId) });
      const billData = tx.result;
      
      if (!billData) return null;

      return billData;
    } catch (error) {
      return null;
    }
  };

  const getUserBills = async (user: string): Promise<Bill[] | null> => {
    if (!client) return null;

    try {
      const tx = await client.get_user_bills({ user });
      const billsData = tx.result;
      const bills: Bill[] = [];
      
      if (!billsData) return null;
      for (const bill of billsData) {
        const billData = await getBill(bill.toString());
        if (!billData) return null;
        bills.push(billData);
      }
      return bills;
    } catch (error) {
      return null;
    }
  };

  // Cancel bill (not implemented yet)
  const cancelBill = async (billId: string): Promise<void> => {
    throw new Error('Cancel bill not implemented');
  };

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
    // Queries
    getBill,
    getUserBills,
    getUserBorrowingPower,
    
    // Mutations
    createBill: (user: string, amount: string, orderId?: string) => 
      createBillMutation.mutateAsync({user, amount, orderId }),
    payBill: (billId: string) => 
      payBillMutation.mutateAsync({ billId }),
    repayBill: (billId: string) => 
      repayBillMutation.mutateAsync({ billId }),
    cancelBill,
    
    // Loading states
    isLoading: createBillMutation.isPending || payBillMutation.isPending || repayBillMutation.isPending,
    error: createBillMutation.error || payBillMutation.error || repayBillMutation.error,
  };
}