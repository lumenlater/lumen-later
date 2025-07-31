'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useUsdcToken } from '@/hooks/web3/use-usdc-token';
import { useLiquidityPool } from '@/hooks/web3/use-liquidity-pool';
import { useUnifiedBNPL } from '@/hooks/use-unified-bnpl';

interface DataContextType {
  // USDC Token data
  usdcBalance: string;
  refreshUSDCBalance: () => Promise<void>;
  
  // Liquidity Pool data
  poolStats: any;
  refreshPoolStats: () => Promise<void>;
  
  // LP Token data
  lpBalance: bigint | null;
  refreshLPBalance: () => Promise<void>;
  
  // Unified BNPL data
  systemStats: any;
  activeLoans: any[];
  userBorrowingPower: any;
  userDebtInfo: any;
  refreshBNPLData: () => Promise<void>;
  
  // Global refresh function
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProviderQuery({ children }: { children: ReactNode }) {
  const { isConnected, publicKey } = useWallet();
  const queryClient = useQueryClient();
  
  // Use React Query hooks
  const { 
    balance, 
    refreshBalance: refreshUSDCBalance 
  } = useUsdcToken();
  
  const { 
    poolStats, 
    refreshPoolStats,
    balance: lpBalance, 
    refreshBalance: refreshLPBalance 
  } = useLiquidityPool();
  
  const { 
    systemStats, 
    activeLoans,
    userBorrowingPower,
    userDebtInfo,
    refreshUserData: refreshBNPLData
  } = useUnifiedBNPL();
  
  // Global refresh function that invalidates all queries
  const refreshAll = async () => {
    if (!isConnected) return;
    
    // Invalidate all queries at once
    await queryClient.invalidateQueries();
  };
  
  const value: DataContextType = {
    usdcBalance: balance || '0.00',
    refreshUSDCBalance,
    poolStats,
    refreshPoolStats,
    lpBalance,
    refreshLPBalance,
    systemStats,
    activeLoans,
    userBorrowingPower,
    userDebtInfo,
    refreshBNPLData: async () => { refreshBNPLData(); },
    refreshAll
  };
  
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}