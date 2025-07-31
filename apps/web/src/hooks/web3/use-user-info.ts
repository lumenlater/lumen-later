/**
 * Hook for fetching user loan and borrowing information
 */

import { useQuery } from '@tanstack/react-query';
import { useBnplClient } from './use-bnpl-client';

export function useUserInfo() {
  const { client, publicKey, queryKeys, fromStroops } = useBnplClient();

  // Get user's borrowing power
  const useBorrowingPower = (userAddress?: string | null) => {
    return useQuery({
      queryKey: queryKeys.borrowingPower(userAddress || ''),
      queryFn: async () => {
        if (!client || !userAddress) {
          throw new Error('Client not initialized or no user address');
        }

        const tx = await client.get_user_borrowing_power({ user: userAddress });
        const result = await tx.simulate();
        
        if (!result || !result.result) {
          throw new Error('Failed to get borrowing power');
        }

        const power = result.result;
        
        return {
          available_borrowing: fromStroops(power.available_borrowing),
          current_borrowed: fromStroops(power.current_borrowed),
          current_debt: fromStroops(power.current_debt),
          lp_balance: fromStroops(power.lp_balance),
          max_borrowing: fromStroops(power.max_borrowing),
          overall_health_factor: fromStroops(power.overall_health_factor),
          required_collateral: fromStroops(power.required_collateral),
        };
      },
      enabled: !!client && !!userAddress,
      retry: 1,
    });
  };

  // Get user's total debt
  const useUserDebt = (userAddress?: string | null) => {
    return useQuery({
      queryKey: queryKeys.debtInfo(userAddress || ''),
      queryFn: async () => {
        if (!client || !userAddress) {
          throw new Error('Client not initialized or no user address');
        }

        const tx = await client.get_user_total_debt({ user: userAddress });
        const result = await tx.simulate();
        
        if (!result || !result.result) {
          throw new Error('Failed to get user debt');
        }

        const [principal, interest] = result.result;
        
        return {
          principal: fromStroops(principal),
          interest: fromStroops(interest),
          total: fromStroops(principal + interest),
        };
      },
      enabled: !!client && !!userAddress,
      retry: 1,
    });
  };

  // Get user's bills from blockchain
  const useUserBills = (userAddress?: string | null) => {
    return useQuery({
      queryKey: queryKeys.loans(userAddress || ''),
      queryFn: async () => {
        if (!client || !userAddress) {
          throw new Error('Client not initialized or no user address');
        }

        const tx = await client.get_user_bills({ user: userAddress });
        const result = await tx.simulate();
        
        if (!result || !result.result) {
          throw new Error('Failed to get user bills');
        }

        return result.result; // Array of bill IDs
      },
      enabled: !!client && !!userAddress,
      retry: 1,
    });
  };

  // Get bill details
  const useBillDetails = (billId: string | bigint | null) => {
    return useQuery({
      queryKey: queryKeys.bill(billId?.toString() || ''),
      queryFn: async () => {
        if (!client || !billId) {
          throw new Error('Client not initialized or no bill ID');
        }

        const tx = await client.get_bill({ bill_id: BigInt(billId) });
        const result = await tx.simulate();
        
        if (!result || !result.result) {
          throw new Error('Failed to get bill details');
        }

        const bill = result.result;
        
        return {
          id: bill.id.toString(),
          merchant: bill.merchant,
          user: bill.user,
          principal: fromStroops(bill.principal),
          order_id: bill.order_id,
          status: bill.status,
          created_at: new Date(Number(bill.created_at) * 1000),
          paid_at: bill.paid_at ? new Date(Number(bill.paid_at) * 1000) : null,
        };
      },
      enabled: !!client && !!billId,
      retry: 1,
    });
  };

  return {
    useBorrowingPower,
    useUserDebt,
    useUserBills,
    useBillDetails,
  };
}