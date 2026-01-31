/**
 * LP Token contract action wrappers
 */

import { logger } from '../utils/logger.js';
import { createClients } from './client-factory.js';
import { stellarCli } from '../utils/stellar-cli.js';

export interface DepositParams {
  accountName: string;
  amount: bigint;
}

export interface WithdrawParams {
  accountName: string;
  lpAmount: bigint;
}

export const lpActions = {
  /**
   * Deposit USDC and get LP tokens
   */
  async deposit(params: DepositParams): Promise<bigint> {
    const { accountName, amount } = params;
    const clients = createClients(accountName);
    const address = stellarCli.getAddress(accountName);

    logger.tx('lp_deposit', `${formatUsdc(amount)} USDC`);

    const tx = await clients.lp.deposit({
      from: address,
      amount,
    });

    const result = await tx.signAndSend();
    const lpReceived = result.result as bigint;

    logger.success(`Deposited, received ${formatLp(lpReceived)} LP tokens`);
    return lpReceived;
  },

  /**
   * Withdraw LP tokens and get USDC back
   */
  async withdraw(params: WithdrawParams): Promise<bigint> {
    const { accountName, lpAmount } = params;
    const clients = createClients(accountName);
    const address = stellarCli.getAddress(accountName);

    logger.tx('lp_withdraw', `${formatLp(lpAmount)} LP tokens`);

    const tx = await clients.lp.withdraw({
      from: address,
      amount: lpAmount,
    });

    const result = await tx.signAndSend();
    const usdcReceived = result.result as bigint;

    logger.success(`Withdrew, received ${formatUsdc(usdcReceived)} USDC`);
    return usdcReceived;
  },

  /**
   * Get LP token balance
   */
  async getBalance(accountName: string, userAddress: string): Promise<bigint> {
    const clients = createClients(accountName);
    const tx = await clients.lp.balance({ user: userAddress });
    return tx.result as bigint;
  },

  /**
   * Get available balance (not locked as collateral)
   */
  async getAvailableBalance(accountName: string, userAddress: string): Promise<bigint> {
    const clients = createClients(accountName);
    const tx = await clients.lp.available_balance({ user: userAddress });
    return tx.result as bigint;
  },

  /**
   * Get exchange rate
   */
  async getExchangeRate(accountName: string): Promise<bigint> {
    const clients = createClients(accountName);
    const tx = await clients.lp.exchange_rate();
    return tx.result as bigint;
  },

  /**
   * Get total supply
   */
  async getTotalSupply(accountName: string): Promise<bigint> {
    const clients = createClients(accountName);
    const tx = await clients.lp.total_supply();
    return tx.result as bigint;
  },

  /**
   * Get total underlying (TVL)
   */
  async getTotalUnderlying(accountName: string): Promise<bigint> {
    const clients = createClients(accountName);
    const tx = await clients.lp.total_underlying();
    return tx.result as bigint;
  },
};

// Formatting helpers (USDC has 7 decimals)
function formatUsdc(amount: bigint): string {
  const value = Number(amount) / 1e7;
  return `$${value.toFixed(2)}`;
}

function formatLp(amount: bigint): string {
  const value = Number(amount) / 1e7;
  return value.toFixed(4);
}
