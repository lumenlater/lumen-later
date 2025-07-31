import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/hooks/web3/use-wallet';
import * as USDCTokenClient from '@lumenlater/usdc-token-client';
import { Config } from '@/constants/config';
import { StellarError, ErrorCodes, getErrorMessage } from '@/lib/stellar';
import { getWalletKit } from '@/lib/stellar-wallets-kit';
import CONTRACT_IDS from '@/config/contracts';

// Query keys for React Query
const usdcTokenKeys = {
  all: ['usdcToken'] as const,
  balance: (address: string) => [...usdcTokenKeys.all, 'balance', address] as const,
  decimals: () => [...usdcTokenKeys.all, 'decimals'] as const,
  allowance: (owner: string, spender: string) => [...usdcTokenKeys.all, 'allowance', owner, spender] as const,
  mintLimit: () => [...usdcTokenKeys.all, 'mintLimit'] as const,
  dailyMinted: (address: string) => [...usdcTokenKeys.all, 'dailyMinted', address] as const,
};

interface UseUSDCTokenReturn {
  balance: string;
  decimals: number;
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  transfer: (to: string, amount: string) => Promise<void>;
  approve: (spender: string, amount: string) => Promise<void>;
  mint: (amount: string) => Promise<void>;
  getAllowance: (spender: string) => Promise<bigint>;
  getMintLimit: () => Promise<bigint>;
  getDailyMinted: (address?: string) => Promise<bigint>;
  txStatus: 'idle' | 'pending' | 'success' | 'error';
  lastTxHash: string | null;
}

export function useUsdcToken(): UseUSDCTokenReturn {
  const { publicKey, isConnected } = useWallet();
  const queryClient = useQueryClient();
  const kit = getWalletKit();

  // Initialize USDC token client
  const client = useMemo(() => {
    if (!publicKey) return null;
    
    return new USDCTokenClient.Client({
      ...USDCTokenClient.networks.testnet,
      contractId: CONTRACT_IDS.USDC_TOKEN,
      rpcUrl: Config.STELLAR_RPC_URL,
      publicKey,
    });
  }, [publicKey]);

  // Convert amount to stroops (7 decimals)
  const toStroops = (amount: string): bigint => {
    return BigInt(Math.floor(parseFloat(amount) * 10 ** Config.USDC_DECIMALS));
  };

  // Convert stroops to display amount
  const fromStroops = (amount: bigint): string => {
    return (Number(amount) / 10 ** Config.USDC_DECIMALS).toFixed(2);
  };

  // Query for USDC balance
  const { data: balanceInStroops, isLoading: isBalanceLoading, error: balanceError } = useQuery({
    queryKey: usdcTokenKeys.balance(publicKey || ''),
    queryFn: async () => {
      if (!client || !publicKey) return 0n;
      
      const balanceResult = await client.balance({ address: publicKey });
      return balanceResult.result || 0n;
    },
    enabled: !!client && !!publicKey && isConnected,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: Config.REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  // Query for decimals (cached indefinitely as it shouldn't change)
  const { data: decimals = Config.USDC_DECIMALS } = useQuery({
    queryKey: usdcTokenKeys.decimals(),
    queryFn: async () => {
      if (!client) return Config.USDC_DECIMALS;
      
      try {
        const decimalsResult = await client.decimals();
        return decimalsResult.result || Config.USDC_DECIMALS;
      } catch {
        return Config.USDC_DECIMALS;
      }
    },
    enabled: !!client,
    staleTime: Infinity, // Never stale
    gcTime: Infinity, // Never garbage collect
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async ({ to, amount }: { to: string; amount: string }) => {
      if (!client || !publicKey || !kit) {
        throw new StellarError(
          ErrorCodes.WALLET_NOT_CONNECTED,
          'Wallet not connected'
        );
      }

      const amountInStroops = toStroops(amount);
      
      // Build the transaction
      const tx = await client.transfer({
        from: publicKey,
        to: to,
        amount: amountInStroops,
      });

      // Sign and submit the transaction
      const signedXdr = await kit.signTransaction(tx.toXDR());
      const txResponse = await tx.signAndSend({ 
        signTransaction: async () => ({ 
          signedTxXdr: signedXdr.signedTxXdr,
          signerAddress: signedXdr.signerAddress 
        }) 
      });
      
      if (txResponse.sendTransactionResponse?.status === 'PENDING') {
        return {
          txHash: txResponse.sendTransactionResponse.hash,
          result: txResponse.result,
        };
      } else {
        throw new Error('Transaction failed');
      }
    },
    onSuccess: () => {
      // Invalidate balance after successful transfer
      queryClient.invalidateQueries({ queryKey: usdcTokenKeys.balance(publicKey || '') });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ spender, amount }: { spender: string; amount: string }) => {
      if (!client || !publicKey || !kit) {
        throw new StellarError(
          ErrorCodes.WALLET_NOT_CONNECTED,
          'Wallet not connected'
        );
      }

      const amountInStroops = toStroops(amount);
      
      // Build the transaction
      const tx = await client.approve({
        from: publicKey,
        spender: spender,
        amount: amountInStroops,
        expiration_ledger: 10000,
      });

      // Sign and submit the transaction
      const signedXdr = await kit.signTransaction(tx.toXDR());
      const txResponse = await tx.signAndSend({ 
        signTransaction: async () => ({ 
          signedTxXdr: signedXdr.signedTxXdr,
          signerAddress: signedXdr.signerAddress 
        }) 
      });
      
      if (txResponse.sendTransactionResponse?.status === 'PENDING') {
        return {
          txHash: txResponse.sendTransactionResponse.hash,
          result: txResponse.result,
        };
      } else {
        throw new Error('Transaction failed');
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate allowance after successful approval
      queryClient.invalidateQueries({ 
        queryKey: usdcTokenKeys.allowance(publicKey || '', variables.spender) 
      });
    },
  });

  // Mint mutation
  const mintMutation = useMutation({
    mutationFn: async ({ amount }: { amount: string }) => {
      if (!client || !publicKey || !kit) {
        throw new StellarError(
          ErrorCodes.WALLET_NOT_CONNECTED,
          'Wallet not connected'
        );
      }

      const amountInStroops = toStroops(amount);
      
      // Build the transaction
      const tx = await client.mint({
        to: publicKey,
        amount: amountInStroops,
      });

      // Sign and submit the transaction
      const signedXdr = await kit.signTransaction(tx.toXDR());
      const txResponse = await tx.signAndSend({ 
        signTransaction: async () => ({ 
          signedTxXdr: signedXdr.signedTxXdr,
          signerAddress: signedXdr.signerAddress 
        }) 
      });
      
      if (txResponse.sendTransactionResponse?.status === 'PENDING') {
        return {
          txHash: txResponse.sendTransactionResponse.hash,
          result: txResponse.result,
        };
      } else {
        throw new Error('Transaction failed');
      }
    },
    onSuccess: () => {
      // Invalidate balance and mint data after successful mint
      queryClient.invalidateQueries({ queryKey: usdcTokenKeys.balance(publicKey || '') });
      queryClient.invalidateQueries({ queryKey: usdcTokenKeys.dailyMinted(publicKey || '') });
    },
  });

  // Get allowance query function
  const getAllowance = async (spender: string): Promise<bigint> => {
    if (!client || !publicKey) return 0n;

    // Use React Query for allowance
    const data = await queryClient.fetchQuery({
      queryKey: usdcTokenKeys.allowance(publicKey, spender),
      queryFn: async () => {
        const result = await client.allowance({
          from: publicKey,
          spender: spender,
        });
        return result.result || 0n;
      },
      staleTime: 30 * 1000, // 30 seconds
    });

    return data;
  };

  // Get mint limit query function
  const getMintLimit = async (): Promise<bigint> => {
    if (!client) return 0n;

    const data = await queryClient.fetchQuery({
      queryKey: usdcTokenKeys.mintLimit(),
      queryFn: async () => {
        const result = await client.get_mint_limit();
        return result.result || 0n;
      },
      staleTime: 60 * 1000, // 60 seconds
    });

    return data;
  };

  // Get daily minted query function
  const getDailyMinted = async (address?: string): Promise<bigint> => {
    if (!client) return 0n;
    const targetAddress = address || publicKey;
    if (!targetAddress) return 0n;

    const data = await queryClient.fetchQuery({
      queryKey: usdcTokenKeys.dailyMinted(targetAddress),
      queryFn: async () => {
        const result = await client.get_daily_minted({ address: targetAddress });
        return result.result || 0n;
      },
      staleTime: 30 * 1000, // 30 seconds
    });

    return data;
  };

  // Refresh balance function
  const refreshBalance = async () => {
    await queryClient.invalidateQueries({ queryKey: usdcTokenKeys.balance(publicKey || '') });
  };

  // Convert balance to display format
  const balance = balanceInStroops ? fromStroops(balanceInStroops) : '0.00';

  // Determine current transaction status
  const txStatus = transferMutation.isPending || approveMutation.isPending || mintMutation.isPending ? 'pending' :
                   transferMutation.isSuccess || approveMutation.isSuccess || mintMutation.isSuccess ? 'success' :
                   transferMutation.isError || approveMutation.isError || mintMutation.isError ? 'error' : 'idle';

  // Get last transaction hash
  const lastTxHash = transferMutation.data?.txHash || approveMutation.data?.txHash || mintMutation.data?.txHash || null;

  // Get error message
  const error = balanceError ? getErrorMessage(balanceError) :
                transferMutation.error ? getErrorMessage(transferMutation.error) :
                approveMutation.error ? getErrorMessage(approveMutation.error) :
                mintMutation.error ? getErrorMessage(mintMutation.error) : null;

  return {
    balance,
    decimals,
    isLoading: isBalanceLoading || transferMutation.isPending || approveMutation.isPending || mintMutation.isPending,
    error,
    refreshBalance,
    transfer: async (to: string, amount: string) => {
      await transferMutation.mutateAsync({ to, amount });
    },
    approve: async (spender: string, amount: string) => {
      await approveMutation.mutateAsync({ spender, amount });
    },
    mint: async (amount: string) => {
      await mintMutation.mutateAsync({ amount });
    },
    getAllowance,
    getMintLimit,
    getDailyMinted,
    txStatus,
    lastTxHash,
  };
}