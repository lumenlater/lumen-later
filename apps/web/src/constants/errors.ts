// Error message constants

export const ErrorMessages = {
  // Wallet errors
  WALLET_NOT_INSTALLED: 'Freighter wallet is not installed. Please install it from https://www.freighter.app/',
  WALLET_CONNECTION_FAILED: 'Failed to connect to Freighter wallet',
  WALLET_CONNECTION_REJECTED: 'Wallet connection was rejected',
  WALLET_NOT_CONNECTED: 'Wallet not connected',
  WALLET_NETWORK_MISMATCH: 'Please switch to Stellar Testnet in your wallet',
  
  // Transaction errors
  TRANSACTION_FAILED: 'Transaction failed',
  TRANSACTION_REJECTED: 'Transaction was rejected',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INVALID_AMOUNT: 'Please enter a valid amount',
  
  // Contract errors
  CONTRACT_NOT_FOUND: 'Contract not found',
  CONTRACT_CALL_FAILED: 'Contract call failed',
  
  // Token errors
  MINT_LIMIT_EXCEEDED: 'Daily mint limit exceeded',
  INVALID_TOKEN_AMOUNT: 'Invalid token amount',
  
  // Network errors
  NETWORK_ERROR: 'Network error. Please try again',
  RPC_ERROR: 'Failed to connect to Stellar network',
  
  // Generic errors
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

export type ErrorMessage = typeof ErrorMessages[keyof typeof ErrorMessages];