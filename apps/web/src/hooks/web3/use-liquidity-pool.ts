/**
 * Integrated Liquidity Pool hook combining pool operations and LP token management
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/hooks/web3/use-wallet';
import * as USDCTokenClient from '@lumenlater/usdc-token-client';
import * as LPTokenClient from '@lumenlater/lp-token-client';
import { Config } from '@/constants/config';
import { StellarError, ErrorCodes, getErrorMessage } from '@/lib/stellar';
import { getWalletKit } from '@/lib/stellar-wallets-kit';
import CONTRACT_IDS from '@/config/contracts';

// Types
export interface PoolStats {
  totalAssets: bigint;
  totalShares: bigint;  
  utilizationRate: number;
  availableLiquidity: bigint;
  totalBorrowed: bigint;
  currentAPY: number;
}

// Query keys for React Query
const liquidityPoolKeys = {
  all: ['liquidityPool'] as const,
  stats: () => [...liquidityPoolKeys.all, 'stats'] as const,
  apy: () => [...liquidityPoolKeys.all, 'apy'] as const,
  balance: (address: string) => [...liquidityPoolKeys.all, 'balance', address] as const,
  decimals: () => [...liquidityPoolKeys.all, 'decimals'] as const,
  lockedBalance: (address: string) => [...liquidityPoolKeys.all, 'lockedBalance', address] as const,
  totalSupply: () => [...liquidityPoolKeys.all, 'totalSupply'] as const,
  totalBorrowed: () => [...liquidityPoolKeys.all, 'totalBorrowed'] as const,
  utilizationRatio: () => [...liquidityPoolKeys.all, 'utilizationRatio'] as const,
};

// Constants - LP tokens use the same decimals as USDC
const LP_TOKEN_DECIMALS = Config.USDC_DECIMALS;

interface UseLiquidityPoolReturn {
  // Pool stats
  poolStats: PoolStats | null;
  
  // LP Token balances
  balance: bigint | null;
  lockedBalance: bigint | null;
  availableBalance: bigint | null;
  formattedBalance: string;
  balanceInUSDC: bigint | null;
  decimals: number;
  totalSupply: bigint | null;
  totalBorrowed: bigint | null;
  utilizationRatio: number | null;
  
  // State
  isLoading: boolean;
  error: string | null;
  txStatus: 'idle' | 'pending' | 'success' | 'error';
  lastTxHash: string | null;
  
  // Pool operations
  deposit: (amount: string) => Promise<bigint>;
  withdraw: (lpTokenAmount: string) => Promise<bigint>;
  
  // LP Token operations
  transfer: (to: string, amount: string) => Promise<void>;
  
  // Utility functions
  refreshPoolStats: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  calculateLPTokenValue: (lpTokenAmount: bigint) => bigint;
  calculateAPY: () => number;
  canTransfer: (amount: string) => boolean;
  canWithdraw: (amount: string) => boolean;
}

export function useLiquidityPool(): UseLiquidityPoolReturn {
  const { publicKey, isConnected } = useWallet();
  const queryClient = useQueryClient();
  const kit = getWalletKit();

  // Initialize LP token client
  const lpClient = useMemo(() => {
    if (!publicKey) return null;
    
    return new LPTokenClient.Client({
      ...LPTokenClient.networks.testnet,
      contractId: CONTRACT_IDS.LP_TOKEN,
      rpcUrl: Config.STELLAR_RPC_URL,
      publicKey,
    });
  }, [publicKey]);

  // Initialize USDC token client for transfers
  const usdcClient = useMemo(() => {
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
    return BigInt(Math.floor(parseFloat(amount) * 10 ** LP_TOKEN_DECIMALS));
  };

  // Convert stroops to display amount
  const fromStroops = (amount: bigint): string => {
    return (Number(amount) / 10 ** LP_TOKEN_DECIMALS).toFixed(6);
  };

  // Query for pool statistics
  const { data: poolStats, isLoading: isStatsLoading, error: statsError } = useQuery({
    queryKey: liquidityPoolKeys.stats(),
    queryFn: async () => {
      if (!lpClient || !usdcClient) return null;

      // Get total supply of LP tokens
      const totalSupplyTx = await lpClient.total_supply();
      const totalShares = totalSupplyTx.result || 0n;
      
      // Get USDC balance of LP token contract (total assets in pool)
      const balanceTx = await usdcClient.balance({ address: CONTRACT_IDS.LP_TOKEN });
      const totalAssets = balanceTx.result || 0n;
      
      // Get system stats from unified BNPL (would be refactored to query)
      const systemStats = queryClient.getQueryData(['unifiedBNPL', 'systemStats']) as any;
      const totalBorrowed = systemStats?.totalVolume24h || 0n;
      
      // Calculate stats
      const availableLiquidity = totalAssets;
      const utilizationRate = totalAssets > 0n 
        ? Number((totalBorrowed * 10000n) / (totalAssets + totalBorrowed)) / 100
        : 0;
      
      // Calculate APY based on utilization
      const baseAPY = 5.0; // 5% base
      const bonusAPY = utilizationRate * 0.1; // up to 10% bonus at 100% utilization
      const currentAPY = baseAPY + bonusAPY;
      
      return {
        totalAssets,
        totalShares,
        utilizationRate,
        availableLiquidity,
        totalBorrowed,
        currentAPY,
      };
    },
    enabled: !!lpClient && !!usdcClient && isConnected,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: Config.REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  // Query for LP token balance
  const { data: balance, isLoading: isBalanceLoading, error: balanceError } = useQuery({
    queryKey: liquidityPoolKeys.balance(publicKey || ''),
    queryFn: async () => {
      if (!lpClient || !publicKey) return null;
      
      const balanceResult = await lpClient.balance({ user: publicKey });
      return balanceResult.result || 0n;
    },
    enabled: !!lpClient && !!publicKey && isConnected,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: Config.REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });
  
  const { data: totalSupply, isLoading: isTotalSupplyLoading, error: totalSupplyError } = useQuery({
    queryKey: liquidityPoolKeys.totalSupply(),
    queryFn: async () => {
      if (!lpClient) return null;
      
      const totalSupplyResult = await lpClient.total_supply();
      return totalSupplyResult.result || 0n;
    },
    enabled: !!lpClient && isConnected,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: Config.REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });
  
  const { data: totalBorrowed, isLoading: isTotalBorrowedLoading, error: totalBorrowedError } = useQuery({
    queryKey: liquidityPoolKeys.totalBorrowed(),
    queryFn: async () => {
      if (!lpClient) return null;
      
      const totalBorrowedResult = await lpClient.total_borrowed();
      return totalBorrowedResult.result || 0n;
    },
    enabled: !!lpClient && isConnected,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: Config.REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });
  
  const { data: utilizationRatio, isLoading: isUtilizationRatioLoading, error: utilizationRatioError } = useQuery({
    queryKey: liquidityPoolKeys.utilizationRatio(),
    queryFn: async () => {
      if (!lpClient) return null;
      
      const utilizationRatioResult = await lpClient.utilization_ratio();
      return utilizationRatioResult.result || 0;
    },
    enabled: !!lpClient && isConnected,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: Config.REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });
  // Query for decimals (cached indefinitely as it shouldn't change)
  const { data: decimals = LP_TOKEN_DECIMALS } = useQuery({
    queryKey: liquidityPoolKeys.decimals(),
    queryFn: async () => {
      if (!lpClient) return LP_TOKEN_DECIMALS;
      
      try {
        const decimalsResult = await lpClient.decimals();
        return decimalsResult.result || LP_TOKEN_DECIMALS;
      } catch {
        return LP_TOKEN_DECIMALS;
      }
    },
    enabled: !!lpClient,
    staleTime: Infinity, // Never stale
    gcTime: Infinity, // Never garbage collect
  });

  // Import userDebtInfo from other queries  
  const userDebtInfo = queryClient.getQueryData(['unifiedBNPL', 'debtInfo', publicKey]);

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (amount: string) => {
      if (!lpClient || !publicKey || !kit) {
        throw new StellarError(
          ErrorCodes.WALLET_NOT_CONNECTED,
          'Wallet not connected'
        );
      }

      const amountInStroops = toStroops(amount);
      
      // Create deposit transaction
      const tx = await lpClient.deposit({
        from: publicKey,
        amount: amountInStroops,
      });

      // Sign and submit the transaction
      const { signedTxXdr } = await kit.signTransaction(tx.toXDR());
      const txResponse = await tx.signAndSend({ 
        signTransaction: async () => ({ signedTxXdr }) 
      });
      
      if (txResponse.sendTransactionResponse?.status === 'PENDING') {
        const txHash = txResponse.sendTransactionResponse.hash;
        const lpTokensMinted = txResponse.result || 0n;
        
        return {
          txHash,
          lpTokensMinted,
        };
      } else {
        throw new Error('Transaction failed');
      }
    },
    onSuccess: () => {
      // Invalidate related queries after successful deposit
      queryClient.invalidateQueries({ queryKey: liquidityPoolKeys.stats() });
      queryClient.invalidateQueries({ queryKey: liquidityPoolKeys.balance(publicKey || '') });
      queryClient.invalidateQueries({ queryKey: ['usdcToken', 'balance'] });
    },
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async (lpTokenAmount: string) => {
      if (!lpClient || !publicKey || !kit) {
        throw new StellarError(
          ErrorCodes.WALLET_NOT_CONNECTED,
          'Wallet not connected'
        );
      }

      const lpAmountInStroops = toStroops(lpTokenAmount);
      
      // Create withdraw transaction
      const tx = await lpClient.withdraw({
        from: publicKey,
        lp_amount: lpAmountInStroops,
      });

      // Sign and submit the transaction
      const { signedTxXdr } = await kit.signTransaction(tx.toXDR());
      const txResponse = await tx.signAndSend({ 
        signTransaction: async () => ({ signedTxXdr }) 
      });
      
      if (txResponse.sendTransactionResponse?.status === 'PENDING') {
        const txHash = txResponse.sendTransactionResponse.hash;
        const usdcReceived = txResponse.result || 0n;
        
        return {
          txHash,
          usdcReceived,
        };
      } else {
        throw new Error('Transaction failed');
      }
    },
    onSuccess: () => {
      // Invalidate related queries after successful withdrawal
      queryClient.invalidateQueries({ queryKey: liquidityPoolKeys.stats() });
      queryClient.invalidateQueries({ queryKey: liquidityPoolKeys.balance(publicKey || '') });
      queryClient.invalidateQueries({ queryKey: ['usdcToken', 'balance'] });
    },
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async ({ to, amount }: { to: string; amount: string }) => {
      if (!lpClient || !publicKey || !kit) {
        throw new StellarError(
          ErrorCodes.WALLET_NOT_CONNECTED,
          'Wallet not connected'
        );
      }

      const amountInStroops = toStroops(amount);
      
      // Build the transaction
      const tx = await lpClient.transfer({
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
      // Invalidate and refetch balance after successful transfer
      queryClient.invalidateQueries({ queryKey: liquidityPoolKeys.balance(publicKey || '') });
    },
  });

  // Calculate formatted balance
  const formattedBalance = balance ? fromStroops(balance) : '0.00';

  // Calculate LP token value in USDC
  const calculateLPTokenValue = (lpTokenAmount: bigint): bigint => {
    if (!poolStats || poolStats.totalShares === 0n) return 0n;
    
    // Value = (lpTokenAmount * totalAssets) / totalShares
    return (lpTokenAmount * poolStats.totalAssets) / poolStats.totalShares;
  };

  // Calculate balance in USDC
  const balanceInUSDC = balance && poolStats ? calculateLPTokenValue(balance) : null;

  // Calculate locked balance from user debt info
  const lockedBalance = useMemo(() => {
    // This would use userDebtInfo from React Query
    // For now, returning null until userDebtInfo is refactored
    return null;
  }, [userDebtInfo]);

  // Calculate available balance (total - locked)
  const availableBalance = useMemo(() => {
    if (!balance || !lockedBalance) return balance;
    const available = balance - lockedBalance;
    return available > 0n ? available : 0n;
  }, [balance, lockedBalance]);

  // Calculate current APY
  const calculateAPY = (): number => {
    if (!poolStats) return 5.0; // Default 5% APY
    return poolStats.currentAPY;
  };

  // Check if user can transfer amount
  const canTransfer = (amount: string): boolean => {
    if (!balance || !availableBalance) return false;
    try {
      const amountInStroops = toStroops(amount);
      return amountInStroops <= availableBalance;
    } catch {
      return false;
    }
  };

  // Check if user can withdraw amount
  const canWithdraw = (amount: string): boolean => {
    // Same logic as transfer for LP tokens
    return canTransfer(amount);
  };

  // Refresh pool statistics
  const refreshPoolStats = async () => {
    await queryClient.invalidateQueries({ queryKey: liquidityPoolKeys.stats() });
  };

  // Refresh balance function
  const refreshBalance = async () => {
    await queryClient.invalidateQueries({ queryKey: liquidityPoolKeys.balance(publicKey || '') });
  };

  // Determine current transaction status
  const txStatus = depositMutation.isPending || withdrawMutation.isPending || transferMutation.isPending ? 'pending' :
                   depositMutation.isSuccess || withdrawMutation.isSuccess || transferMutation.isSuccess ? 'success' :
                   depositMutation.isError || withdrawMutation.isError || transferMutation.isError ? 'error' : 'idle';

  // Get last transaction hash
  const lastTxHash = depositMutation.data?.txHash || withdrawMutation.data?.txHash || transferMutation.data?.txHash || null;

  // Get error message
  const error = statsError ? getErrorMessage(statsError) :
                balanceError ? getErrorMessage(balanceError) :
                totalSupplyError ? getErrorMessage(totalSupplyError) :
                totalBorrowedError ? getErrorMessage(totalBorrowedError) :
                utilizationRatioError ? getErrorMessage(utilizationRatioError) :
                depositMutation.error ? getErrorMessage(depositMutation.error) :
                withdrawMutation.error ? getErrorMessage(withdrawMutation.error) :
                transferMutation.error ? getErrorMessage(transferMutation.error) : null;

  // Determine loading state
  const isLoading = isStatsLoading || isBalanceLoading || isTotalSupplyLoading || isTotalBorrowedLoading || isUtilizationRatioLoading || 
                    depositMutation.isPending || withdrawMutation.isPending || transferMutation.isPending;

  return {
    // Pool stats
    poolStats: poolStats || null,
    
    // LP Token balances
    balance: balance ?? null,
    lockedBalance,
    availableBalance: availableBalance || null,
    formattedBalance,
    balanceInUSDC,
    decimals,
    totalSupply: totalSupply ?? null,
    totalBorrowed: totalBorrowed ?? null,
    utilizationRatio: utilizationRatio ?? null,
    
    // State
    isLoading,
    error,
    txStatus,
    lastTxHash,
    
    // Pool operations
    deposit: async (amount: string) => {
      const result = await depositMutation.mutateAsync(amount);
      return result.lpTokensMinted;
    },
    withdraw: async (lpTokenAmount: string) => {
      const result = await withdrawMutation.mutateAsync(lpTokenAmount);
      return result.usdcReceived;
    },
    
    // LP Token operations
    transfer: async (to: string, amount: string) => {
      await transferMutation.mutateAsync({ to, amount });
    },
    
    // Utility functions
    refreshPoolStats,
    refreshBalance,
    calculateLPTokenValue,
    calculateAPY,
    canTransfer,
    canWithdraw,
  };
}