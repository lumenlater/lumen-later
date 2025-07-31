import { rpc, xdr, TransactionBuilder } from '@stellar/stellar-sdk';

// Transaction related types
export interface TransactionOptions {
  fee?: string;
  timeout?: number;
  memo?: string;
}

export interface SimulationOptions {
  sourceAccount?: string;
}

export interface SubmitOptions {
  maxRetries?: number;
  pollingInterval?: number;
  onStatusChange?: (status: TransactionStatus) => void;
}

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'timeout';

export interface TransactionResult {
  hash: string;
  status: TransactionStatus;
  result?: any;
  error?: Error;
}

// Contract operation types
export interface ContractCall {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
}

// Error types
export class StellarError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'StellarError';
  }
}

export class TransactionError extends StellarError {
  constructor(message: string, details?: any) {
    super(message, 'TRANSACTION_ERROR', details);
  }
}

export class SimulationError extends StellarError {
  constructor(message: string, details?: any) {
    super(message, 'SIMULATION_ERROR', details);
  }
}