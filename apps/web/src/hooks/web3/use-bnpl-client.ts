/**
 * Base BNPL client hook for shared web3 functionality
 */

import { useMemo, useCallback } from 'react';
import { useWallet } from './use-wallet';
import * as BNPLCoreClient from '@lumenlater/bnpl-core-client';
import { Config } from '@/constants/config';
import { getWalletKit } from '@/lib/stellar-wallets-kit';
import CONTRACT_IDS from '@/config/contracts';

// Query keys for React Query
export const bnplQueryKeys = {
  all: ['unifiedBNPL'] as const,
  // Loan keys
  loans: (user: string) => [...bnplQueryKeys.all, 'loans', user] as const,
  loanInfo: (loanId: string) => [...bnplQueryKeys.all, 'loan', loanId] as const,
  dueInstallments: (loanId: string) => [...bnplQueryKeys.all, 'dueInstallments', loanId] as const,
  borrowingPower: (user: string) => [...bnplQueryKeys.all, 'borrowingPower', user] as const,
  debtInfo: (user: string) => [...bnplQueryKeys.all, 'debtInfo', user] as const,
  // Bill keys
  bill: (billId: string) => [...bnplQueryKeys.all, 'bill', billId] as const,
  bills: (merchant: string) => [...bnplQueryKeys.all, 'bills', merchant] as const,
  // Merchant keys
  merchantStatus: (merchant: string) => [...bnplQueryKeys.all, 'merchantStatus', merchant] as const,
  merchantStats: (merchant: string) => [...bnplQueryKeys.all, 'merchantStats', merchant] as const,
  merchantData: (merchant: string) => [...bnplQueryKeys.all, 'merchantData', merchant] as const,
  // System keys
  systemStats: () => [...bnplQueryKeys.all, 'systemStats'] as const,
  protocolConstants: () => [...bnplQueryKeys.all, 'protocolConstants'] as const,
  // Admin keys
  admins: () => [...bnplQueryKeys.all, 'admins'] as const,
  adminStatus: (address: string) => [...bnplQueryKeys.all, 'adminStatus', address] as const,
};

export function useBnplClient() {
  const { publicKey, isConnected, signTransaction } = useWallet();
  const kit = getWalletKit();

  // Initialize client
  const client = useMemo(() => {
    if (!publicKey) {
      return null;
    }
    
    return new BNPLCoreClient.Client({
      ...BNPLCoreClient.networks.testnet,
      contractId: CONTRACT_IDS.BNPL_CORE,
      rpcUrl: Config.STELLAR_RPC_URL,
      publicKey,
    });
  }, [publicKey]);

  // Utility functions
  const toStroops = useCallback((amount: string): bigint => {
    return BigInt(Math.floor(parseFloat(amount) * 10 ** Config.USDC_DECIMALS));
  }, []);

  const fromStroops = useCallback((amount: bigint): number => {
    return Number(amount) / 10 ** Config.USDC_DECIMALS;
  }, []);

  // Sign and send transaction helper
  const signAndSendTx = useCallback(async (tx: any) => {
    if (!kit || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    const { signedTxXdr } = await signTransaction(tx.toXDR());
    return tx.signAndSend({ 
      signTransaction: async () => ({ signedTxXdr }) 
    });
  }, [kit, signTransaction]);

  return {
    client,
    publicKey,
    isConnected,
    toStroops,
    fromStroops,
    signAndSendTx,
    queryKeys: bnplQueryKeys,
  };
}