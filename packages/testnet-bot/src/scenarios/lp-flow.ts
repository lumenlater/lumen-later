/**
 * LP Flow scenarios - deposit and withdraw
 */

import { BaseScenario, type ScenarioResult } from './base.js';
import { accountPool } from '../accounts/pool.js';
import { lpActions } from '../contracts/lp-actions.js';
import { usdcActions, toUsdcUnits, fromUsdcUnits } from '../contracts/usdc-actions.js';
import { logger } from '../utils/logger.js';
import { randomInt } from '@lumenlater/shared';
import { config } from '../config/index.js';

/**
 * LP Deposit Scenario
 */
export class LpDepositScenario extends BaseScenario {
  type = 'lp-deposit' as const;

  async canRun(): Promise<boolean> {
    const user = accountPool.getRandomUser();
    if (!user) return false;

    // Check if user has USDC
    const balance = await usdcActions.getBalance(config.admin.accountName, user.address);
    return balance > toUsdcUnits(10); // At least $10
  }

  async execute(): Promise<ScenarioResult> {
    try {
      const user = accountPool.getRandomUser();
      if (!user) return this.failure('No users available');

      // Get user's USDC balance
      const usdcBalance = await usdcActions.getBalance(config.admin.accountName, user.address);
      const usdcDollars = fromUsdcUnits(usdcBalance);

      if (usdcDollars < 10) {
        return this.failure('Insufficient USDC balance');
      }

      // Random deposit amount (10-50% of balance, min $10, max $500)
      const depositPercent = randomInt(10, 50) / 100;
      const depositAmount = Math.min(
        Math.max(Math.floor(usdcDollars * depositPercent), 10),
        500
      );

      logger.info(`User ${user.name} depositing $${depositAmount}`);

      await lpActions.deposit({
        accountName: user.name,
        amount: toUsdcUnits(depositAmount),
      });

      return this.success({
        user: user.name,
        amount: depositAmount,
      });
    } catch (error: any) {
      return this.failure(error.message);
    }
  }
}

/**
 * LP Withdraw Scenario
 */
export class LpWithdrawScenario extends BaseScenario {
  type = 'lp-withdraw' as const;

  async canRun(): Promise<boolean> {
    const user = accountPool.getRandomUser();
    if (!user) return false;

    // Check if user has available LP (not locked as collateral)
    const available = await lpActions.getAvailableBalance(config.admin.accountName, user.address);
    return available > toUsdcUnits(10);
  }

  async execute(): Promise<ScenarioResult> {
    try {
      const user = accountPool.getRandomUser();
      if (!user) return this.failure('No users available');

      // Get available LP balance
      const availableLp = await lpActions.getAvailableBalance(config.admin.accountName, user.address);
      const availableDollars = fromUsdcUnits(availableLp);

      if (availableDollars < 10) {
        return this.failure('Insufficient available LP balance');
      }

      // Random withdraw amount (10-30% of available, min $10, max $200)
      const withdrawPercent = randomInt(10, 30) / 100;
      const withdrawAmount = Math.min(
        Math.max(Math.floor(availableDollars * withdrawPercent), 10),
        200
      );

      logger.info(`User ${user.name} withdrawing ~$${withdrawAmount} LP`);

      await lpActions.withdraw({
        accountName: user.name,
        lpAmount: toUsdcUnits(withdrawAmount),
      });

      return this.success({
        user: user.name,
        amount: withdrawAmount,
      });
    } catch (error: any) {
      return this.failure(error.message);
    }
  }
}
