// Stellar and Freighter type definitions

export enum NetworkType {
  TESTNET = 'TESTNET',
  MAINNET = 'PUBLIC',
  FUTURENET = 'FUTURENET',
  SANDBOX = 'SANDBOX',
  STANDALONE = 'STANDALONE'
}

export interface FreighterApi {
  isConnected: () => Promise<boolean>;
  getPublicKey: () => Promise<string>;
  signTransaction: (xdr: string, opts?: { network?: string; networkPassphrase?: string }) => Promise<string>;
  getNetwork: () => Promise<string>;
  getNetworkDetails: () => Promise<{ network: string; networkPassphrase: string }>;
  requestAccess: () => Promise<string>;
  setAllowed: () => Promise<boolean>;
}

export interface FreighterWindow extends Window {
  freighter?: FreighterApi;
  freighterApi?: FreighterApi;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

export interface TokenBalance {
  balance: string;
  decimals: number;
  formatted: string;
}