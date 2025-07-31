/**
 * BNPL Admin operations hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBnplClient } from './use-bnpl-client';

export function useBnplAdmin() {
  const { client, publicKey, isConnected, signAndSendTx, queryKeys } = useBnplClient();
  const queryClient = useQueryClient();

  // Get system stats
  const { data: systemStats, refetch: refetchSystemStats } = useQuery({
    queryKey: queryKeys.systemStats(),
    queryFn: async () => {
      if (!client) return null;

      // const tx = await client.get_system_stats();
      // return tx.result;
      return null;
    },
    enabled: !!client,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isAdmin = async (address: string): Promise<boolean> => {
    if (!client) return false;

    try {
      const tx = await client.is_admin({ address });
      return tx.result || false;
    } catch (error) {
      return false;
    }
  };

  const getProtocolConstants = async (): Promise<any | null> => {
    if (!client) return null;

    try {
      const tx = await client.get_protocol_constants();
      const constantsMap = tx.result;
      
      // Convert Map to object with proper field names
      return {
        max_borrowing_ratio: Number(constantsMap.get('max_borrowing_ratio') || 0n),
        min_collateral_ratio: Number(constantsMap.get('min_collateral_ratio') || 0n),
        liquidation_threshold: Number(constantsMap.get('liquidation_threshold') || 0n),
        grace_period_days: Number(constantsMap.get('grace_period_days') || 0n),
        late_fee_rate: Number(constantsMap.get('late_fee_rate') || 0n),
        origin_fee_rate: Number(constantsMap.get('origin_fee_rate') || 0n),
        merchant_fee_rate: Number(constantsMap.get('merchant_fee_rate') || 0n),
      };
    } catch (error) {
      return null;
    }
  };

  return {
    // State
    systemStats: systemStats || null,
    
    // Queries
    getSystemStats: refetchSystemStats,
    isAdmin,
    getProtocolConstants,
    
    // Mutations
    
    
    // Loading states
    isLoading: false,
    error: null,
  };
}