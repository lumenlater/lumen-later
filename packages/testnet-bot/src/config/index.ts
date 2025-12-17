/**
 * Bot configuration
 */

import 'dotenv/config';

export interface BotConfig {
  network: {
    name: string;
    rpcUrl: string;
    passphrase: string;
  };
  contracts: {
    usdcTokenId: string;
    lpTokenId: string;
    bnplCoreId: string;
  };
  admin: {
    accountName: string;
  };
  api: {
    baseUrl: string;
  };
  mongodb: {
    uri: string;
    dbName: string;
  };
  goals: {
    tvl: number;
    merchants: number;
    users: number;
    dailyTx: number;
  };
  schedule: {
    minInterval: number;
    maxInterval: number;
    activeHours: { start: number; end: number };
  };
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): BotConfig {
  return {
    network: {
      name: optionalEnv('STELLAR_NETWORK', 'testnet'),
      rpcUrl: optionalEnv('STELLAR_RPC_URL', 'https://soroban-testnet.stellar.org:443'),
      passphrase: optionalEnv('STELLAR_NETWORK_PASSPHRASE', 'Test SDF Network ; September 2015'),
    },
    contracts: {
      usdcTokenId: requireEnv('USDC_TOKEN_ID'),
      lpTokenId: requireEnv('LP_TOKEN_ID'),
      bnplCoreId: requireEnv('BNPL_CORE_ID'),
    },
    admin: {
      accountName: optionalEnv('STELLAR_ACCOUNT', 'deployer'),
    },
    api: {
      baseUrl: optionalEnv('API_BASE_URL', 'http://localhost:3000/api'),
    },
    mongodb: {
      uri: requireEnv('MONGODB_URI'),
      dbName: optionalEnv('MONGODB_DB_NAME', 'soroban-bnpl'),
    },
    goals: {
      tvl: parseInt(optionalEnv('TARGET_TVL', '100000')),
      merchants: parseInt(optionalEnv('TARGET_MERCHANTS', '10')),
      users: parseInt(optionalEnv('TARGET_USERS', '20')),
      dailyTx: parseInt(optionalEnv('TARGET_DAILY_TX', '50')),
    },
    schedule: {
      minInterval: parseInt(optionalEnv('MIN_INTERVAL', '30000')),
      maxInterval: parseInt(optionalEnv('MAX_INTERVAL', '300000')),
      activeHours: { start: 0, end: 24 },
    },
  };
}

export const config = loadConfig();
