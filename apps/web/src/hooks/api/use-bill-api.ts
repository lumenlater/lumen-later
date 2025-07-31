import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import CONTRACT_IDS from '@/config/contracts';

export interface Bill {
  id: string;
  createdAt: string;
  updatedAt: string;
  contractId: string;
  merchantAddress: string;
  userAddress: string;
  onChainBillId: number | null;
  amount: number;
  description: string;
  merchantName: string;
}

export interface CreateBillInput {
  contractId: string;
  merchantAddress: string;
  userAddress: string;
  amount: number;
  description: string;
  merchantName: string;
}

export interface UpdateBillInput {
  id: string;
  onChainBillId: number;
}

// Query keys
const billKeys = {
  all: ['bills'] as const,
  byId: (id: string) => [...billKeys.all, 'byId', id] as const,
  byMerchant: (address: string) => [...billKeys.all, 'byMerchant', address] as const,
  byUser: (address: string) => [...billKeys.all, 'byUser', address] as const,
};

export function useBillAPI() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch bills by merchant address (optionally filtered by contractId)
  const useBillsByMerchant = (merchantAddress: string | null, contractId?: string) => {
    return useQuery({
      queryKey: [...billKeys.byMerchant(merchantAddress || ''), contractId],
      queryFn: async () => {
        if (!merchantAddress) return [];
        
        let url = `/api/bills?merchantAddress=${merchantAddress}`;
        if (contractId) {
          url += `&contractId=${contractId}`;
        }else{
          url += `&contractId=${CONTRACT_IDS.BNPL_CORE}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch bills');
        }
        return response.json() as Promise<Bill[]>;
      },
      enabled: !!merchantAddress,
    });
  };

  // Fetch bills by user address (optionally filtered by contractId)
  const useBillsByUser = (userAddress: string | null, contractId?: string) => {
    return useQuery({
      queryKey: [...billKeys.byUser(userAddress || ''), contractId],
      queryFn: async () => {
        if (!userAddress) return [];
        
        let url = `/api/bills?userAddress=${userAddress}`;
        if (contractId) {
          url += `&contractId=${contractId}`;
        }else{
          url += `&contractId=${CONTRACT_IDS.BNPL_CORE}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch bills');
        }
        return response.json() as Promise<Bill[]>;
      },
      enabled: !!userAddress,
    });
  };

  // Fetch single bill by ID
  const useBillById = (id: string | null) => {
    return useQuery({
      queryKey: billKeys.byId(id || ''),
      queryFn: async () => {
        if (!id) return null;
        
        const response = await fetch(`/api/bills?id=${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch bill');
        }
        return response.json() as Promise<Bill>;
      },
      enabled: !!id,
    });
  };

  // Create new bill
  const createBill = useMutation({
    mutationFn: async (input: CreateBillInput) => {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Failed to create bill');
      }

      return response.json() as Promise<Bill>;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: billKeys.all });
      
      toast({
        title: 'Bill created',
        description: `Bill created successfully. ID: ${data.id}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create bill',
        variant: 'destructive',
      });
    },
  });

  // Update bill with on-chain ID
  const updateBillWithOnChainId = useMutation({
    mutationFn: async (input: UpdateBillInput) => {
      const response = await fetch('/api/bills', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Failed to update bill');
      }

      return response.json() as Promise<Bill>;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: billKeys.byId(data.id) });
      queryClient.invalidateQueries({ queryKey: billKeys.byMerchant(data.merchantAddress) });
      queryClient.invalidateQueries({ queryKey: billKeys.byUser(data.userAddress) });
      
      toast({
        title: 'Bill updated',
        description: `Bill updated with on-chain ID: ${data.onChainBillId}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update bill',
        variant: 'destructive',
      });
    },
  });

  return {
    // Queries
    useBillsByMerchant,
    useBillsByUser,
    useBillById,
    
    // Mutations
    createBill,
    updateBillWithOnChainId,
  };
}