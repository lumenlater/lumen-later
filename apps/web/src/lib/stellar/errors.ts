import { StellarError } from './types';

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  RPC_ERROR: 'RPC_ERROR',
  
  // Transaction errors
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT: 'TRANSACTION_TIMEOUT',
  INSUFFICIENT_FEE: 'INSUFFICIENT_FEE',
  
  // Simulation errors
  SIMULATION_FAILED: 'SIMULATION_FAILED',
  RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',
  
  // Contract errors
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  CONTRACT_NOT_FOUND: 'CONTRACT_NOT_FOUND',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  
  // Wallet errors
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  WALLET_REJECTED: 'WALLET_REJECTED',
  WALLET_NETWORK_MISMATCH: 'WALLET_NETWORK_MISMATCH',
} as const;

/**
 * Parse error from Soroban RPC response
 */
export function parseRpcError(error: any): StellarError {
  if (error.code === 'NETWORK_ERROR') {
    return new StellarError(
      'Network connection failed',
      ErrorCodes.NETWORK_ERROR,
      error
    );
  }

  if (error.message?.includes('insufficient fee')) {
    return new StellarError(
      'Transaction fee too low',
      ErrorCodes.INSUFFICIENT_FEE,
      error
    );
  }

  if (error.message?.includes('resource limit')) {
    return new StellarError(
      'Resource limit exceeded',
      ErrorCodes.RESOURCE_LIMIT_EXCEEDED,
      error
    );
  }

  return new StellarError(
    error.message || 'Unknown error',
    ErrorCodes.RPC_ERROR,
    error
  );
}

/**
 * User-friendly error messages
 */
export function getErrorMessage(error: any): string {
  if (error instanceof StellarError) {
    switch (error.code) {
      case ErrorCodes.WALLET_NOT_CONNECTED:
        return 'Please connect your wallet to continue';
      case ErrorCodes.WALLET_REJECTED:
        return 'Transaction was rejected by wallet';
      case ErrorCodes.WALLET_NETWORK_MISMATCH:
        return 'Please switch to the correct network in your wallet';
      case ErrorCodes.TRANSACTION_TIMEOUT:
        return 'Transaction took too long to confirm';
      case ErrorCodes.INSUFFICIENT_FEE:
        return 'Transaction fee is too low';
      case ErrorCodes.CONTRACT_NOT_FOUND:
        return 'Contract not found on the network';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Retry handler for transient errors
 */
export async function retryOnError<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error instanceof StellarError) {
        if ([
          ErrorCodes.WALLET_REJECTED,
          ErrorCodes.WALLET_NOT_CONNECTED,
          ErrorCodes.CONTRACT_NOT_FOUND,
          ErrorCodes.INVALID_ARGUMENT
        ].includes(error.code as any)) {
          throw error;
        }
      }
      
      // Wait before retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  
  throw lastError;
}