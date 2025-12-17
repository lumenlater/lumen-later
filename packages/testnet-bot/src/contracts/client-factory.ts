/**
 * Contract client factory
 */

import { Keypair } from '@stellar/stellar-sdk';
import { Client as BnplClient } from '@lumenlater/bnpl-core-client';
import { Client as LpClient } from '@lumenlater/lp-token-client';
import { Client as UsdcClient } from '@lumenlater/usdc-token-client';
import { config } from '../config/index.js';
import { stellarCli } from '../utils/stellar-cli.js';

export interface ContractClients {
  bnpl: BnplClient;
  lp: LpClient;
  usdc: UsdcClient;
}

/**
 * Create contract clients for a given account
 */
export function createClients(accountName: string): ContractClients {
  const secret = stellarCli.getSecret(accountName);
  const keypair = Keypair.fromSecret(secret);

  const commonOptions = {
    rpcUrl: config.network.rpcUrl,
    networkPassphrase: config.network.passphrase,
    publicKey: keypair.publicKey(),
    signTransaction: async (tx: string) => {
      const { TransactionBuilder } = await import('@stellar/stellar-sdk');
      const txXdr = TransactionBuilder.fromXDR(tx, config.network.passphrase);
      txXdr.sign(keypair);
      return {
        signedTxXdr: txXdr.toXDR(),
        signerAddress: keypair.publicKey(),
      };
    },
  };

  const bnpl = new BnplClient({
    ...commonOptions,
    contractId: config.contracts.bnplCoreId,
  });

  const lp = new LpClient({
    ...commonOptions,
    contractId: config.contracts.lpTokenId,
  });

  const usdc = new UsdcClient({
    ...commonOptions,
    contractId: config.contracts.usdcTokenId,
  });

  return { bnpl, lp, usdc };
}

// Cached admin clients
let adminClients: ContractClients | null = null;

export function getAdminClients(): ContractClients {
  if (!adminClients) {
    adminClients = createClients(config.admin.accountName);
  }
  return adminClients;
}
