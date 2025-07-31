/**
 * BNPL Merchant operations hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBnplClient } from './use-bnpl-client';
import { UnifiedMerchantStatus } from '@/types/merchant';
import { MerchantStatus} from '@lumenlater/bnpl-core-client';

export const createMerchantStatus = (status: 'None' | 'Pending' | 'Approved' | 'Rejected' | 'Suspended'):
MerchantStatus => {
  return { tag: status, values: undefined };
};

export function useBnplMerchant(merchant_public_key: string) {
  const { client, isConnected, signAndSendTx, queryKeys , publicKey} = useBnplClient();
  const queryClient = useQueryClient();

  // Get merchant status
  const { 
    data: merchantData = { status: createMerchantStatus('None'), merchant_info_id: '' }, 
    refetch: refetchMerchantStatus,
    isLoading: isLoadingStatus,
    isError: isStatusError
  } = useQuery({
    queryKey: ['get_merchant', merchant_public_key],
    queryFn: async () => {
      if (!merchant_public_key || !client || merchant_public_key === '') {
        return { status: createMerchantStatus('None'), merchant_info_id: '' };
      }

      try {
        const data = await client.get_merchant({ merchant: merchant_public_key });
        return { status: data.result?.status.tag, merchant_info_id: data.result?.merchant_info_id };
      } catch (error) {
        // If error, merchant is not enrolled (status = None)
        return { status: UnifiedMerchantStatus.None, merchant_info_id: '' };
      }
    },
    enabled: !!merchant_public_key && isConnected && !!client,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry if it's a 404 or merchant not found error
      if (error && error.message && error.message.includes('not found')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    refetchOnWindowFocus: false, // Prevent refetch on window focus
  });

  // Get merchant data
  const getMerchantData = async (): Promise<{ applicationId: string; status: UnifiedMerchantStatus } | null> => {
    if (!merchant_public_key || !client) return null;
    
    try {
      const merchantTx = await client.get_merchant({ merchant: merchant_public_key });
      const merchantData = merchantTx.result;
      
      if (merchantData) {
        return {
          applicationId: merchantData.merchant_info_id,
          status: merchantData.status.tag as UnifiedMerchantStatus,
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };


  // Enroll merchant mutation
  const enrollMerchantMutation = useMutation({
    mutationFn: async ({ merchant_info_id }: { merchant_info_id: string }) => {
      if (!client || !merchant_public_key) throw new Error('Not connected');

      try {
        // Enroll merchant with application ID
        const tx = await client.enroll_merchant({
          merchant: merchant_public_key,
          merchant_info_id: merchant_info_id,
        });
        
        const result = await signAndSendTx(tx);
        
        // After successful enrollment, refetch merchant status
        setTimeout(() => {
          refetchMerchantStatus();
        }, 2000);
        
        return result.txHash;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate merchant status to reflect the new enrollment
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantStats(merchant_public_key || '') });
    },
  });

  // Update merchant status mutation (admin function)
  const updateMerchantStatusMutation = useMutation({
    mutationFn: async ({ merchant, status }: { merchant: string; status: MerchantStatus }) => {
      if (!client || !merchant_public_key) throw new Error('Not connected');
      
      const tx = await client.update_merchant_status({
        admin: publicKey || '',
        merchant,
        new_status: status,
      });
      
      const result = await signAndSendTx(tx);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const isApprovedMerchant = merchantData?.status === UnifiedMerchantStatus.Approved;

  return {
    // State
    merchantData,
    isApprovedMerchant,


    getMerchantData,

    // Mutations
    enrollMerchant: (merchant_info_id: string) => enrollMerchantMutation.mutateAsync({ merchant_info_id }),
    updateMerchantStatus: (merchant: string, status: MerchantStatus) => 
      updateMerchantStatusMutation.mutateAsync({ merchant, status }),
    authorizeMerchant: (merchant: string, authorized: boolean) => 
      updateMerchantStatusMutation.mutateAsync({ 
        merchant, 
        status: authorized ? createMerchantStatus('Approved') : createMerchantStatus('Suspended')
      }),
    
    // Refetch status
    refetchMerchantStatus,

    // Loading states
    isLoading: isLoadingStatus || enrollMerchantMutation.isPending || updateMerchantStatusMutation.isPending,
    isLoadingStatus,
    error: enrollMerchantMutation.error || updateMerchantStatusMutation.error || (isStatusError ? new Error('Failed to fetch merchant status') : null),
  };
}