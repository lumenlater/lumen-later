/**
 * USDC Token contract action wrappers
 */

import { logger } from '../utils/logger.js';
import { createClients } from './client-factory.js';
import { stellarCli } from '../utils/stellar-cli.js';

export interface MintParams {
  adminAccountName: string;
  toAddress: string;
  amount: bigint;
}

export interface TransferParams {
  fromAccountName: string;
  toAddress: string;
  amount: bigint;
}

export interface ApproveParams {
  ownerAccountName: string;
  spenderAddress: string;
  amount: bigint;
  expirationLedger?: number;
}

export const usdcActions = {
  /**
   * Mint USDC tokens (admin only)
   */
  async mint(params: MintParams): Promise<void> {
    const { adminAccountName, toAddress, amount } = params;
    const clients = createClients(adminAccountName);

    logger.tx('usdc_mint', `${formatUsdc(amount)} to ${toAddress.slice(0, 8)}...`);

    const tx = await clients.usdc.mint({
      to: toAddress,
      amount,
    });

    await tx.signAndSend();
    logger.success(`Minted ${formatUsdc(amount)} USDC`);
  },

  /**
   * Transfer USDC tokens
   */
  async transfer(params: TransferParams): Promise<void> {
    const { fromAccountName, toAddress, amount } = params;
    const clients = createClients(fromAccountName);
    const fromAddress = stellarCli.getAddress(fromAccountName);

    logger.tx('usdc_transfer', `${formatUsdc(amount)} to ${toAddress.slice(0, 8)}...`);

    const tx = await clients.usdc.transfer({
      from: fromAddress,
      to: toAddress,
      amount,
    });

    await tx.signAndSend();
    logger.success(`Transferred ${formatUsdc(amount)} USDC`);
  },

  /**
   * Approve spender to spend USDC on behalf of owner
   */
  async approve(params: ApproveParams): Promise<void> {
    const { ownerAccountName, spenderAddress, amount, expirationLedger } = params;
    const clients = createClients(ownerAccountName);
    const ownerAddress = stellarCli.getAddress(ownerAccountName);

    // Default expiration: ~1 year from now (assuming ~5 sec per ledger)
    const expiration = expirationLedger ?? Math.floor(Date.now() / 1000 / 5) + 6_307_200;

    logger.tx('usdc_approve', `${formatUsdc(amount)} to ${spenderAddress.slice(0, 8)}...`);

    const tx = await clients.usdc.approve({
      from: ownerAddress,
      spender: spenderAddress,
      amount,
      expiration_ledger: expiration,
    });

    await tx.signAndSend();
    logger.success(`Approved ${formatUsdc(amount)} USDC for spender`);
  },

  /**
   * Get USDC balance
   */
  async getBalance(accountName: string, userAddress: string): Promise<bigint> {
    const clients = createClients(accountName);
    const tx = await clients.usdc.balance({ address: userAddress });
    return tx.result as bigint;
  },

  /**
   * Get total supply
   */
  async getTotalSupply(accountName: string): Promise<bigint> {
    const clients = createClients(accountName);
    const tx = await clients.usdc.total_supply();
    return tx.result as bigint;
  },
};

// Format USDC amount (7 decimals)
function formatUsdc(amount: bigint): string {
  const value = Number(amount) / 1e7;
  return `$${value.toFixed(2)}`;
}

// Convert dollars to USDC units
export function toUsdcUnits(dollars: number): bigint {
  return BigInt(Math.round(dollars * 1e7));
}

// Convert USDC units to dollars
export function fromUsdcUnits(units: bigint): number {
  return Number(units) / 1e7;
}
