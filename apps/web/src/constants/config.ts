// Configuration constants

export const Config = {
  // Network configuration
  STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet',
  STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  NETWORK_PASSPHRASE: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  
  // Explorer URLs
  STELLAR_EXPERT_URL: 'https://stellar.expert/explorer/testnet',
  
  // Token configuration
  USDC_DECIMALS: 7,
  USDC_DAILY_MINT_LIMIT: 1000,
  
  // UI configuration
  DEFAULT_MINT_AMOUNT: '100',
  QUICK_MINT_AMOUNTS: ['10', '50', '100', '500'],
  
  // Timing configuration
  REFRESH_INTERVAL: 120000, // 2 minutes
  TRANSACTION_TIMEOUT: 30000, // 30 seconds
  
  // Development
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  ENABLE_MOCK_DATA: process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true',
} as const;