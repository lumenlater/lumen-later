/**
 * BNPL Cycle scenarios - create bill, pay, repay
 */

import { BaseScenario, type ScenarioResult } from './base.js';
import { accountPool } from '../accounts/pool.js';
import { bnplActions } from '../contracts/bnpl-actions.js';
import { lpActions } from '../contracts/lp-actions.js';
import { toUsdcUnits, fromUsdcUnits } from '../contracts/usdc-actions.js';
import { logger } from '../utils/logger.js';
import { generateBillData, randomInt } from '@lumenlater/shared';
import { config } from '../config/index.js';

/**
 * Create Bill Scenario
 */
export class CreateBillScenario extends BaseScenario {
  type = 'bnpl-create-bill' as const;

  async canRun(): Promise<boolean> {
    const merchant = accountPool.getRandomMerchant('approved');
    const user = accountPool.getRandomUser();

    return merchant !== null && user !== null;
  }

  async execute(): Promise<ScenarioResult> {
    try {
      const merchant = accountPool.getRandomMerchant('approved');
      const user = accountPool.getRandomUser();

      if (!merchant || !user) {
        return this.failure('No approved merchant or user available');
      }

      // Generate bill data
      const billData = generateBillData({
        minAmount: 1000,  // $10
        maxAmount: 20000, // $200
        merchantName: merchant.name,
      });

      logger.info(`Creating bill: ${billData.orderId} for $${Number(billData.amount) / 1e7}`);

      const billId = await bnplActions.createBill({
        merchantAccountName: merchant.name,
        merchantAddress: merchant.address,
        userAddress: user.address,
        amount: billData.amount,
        orderId: billData.orderId,
      });

      // Update merchant state
      accountPool.updateMerchant(merchant.address, {
        billsCreated: (merchant.billsCreated || 0) + 1,
      });

      return this.success({
        billId: billId.toString(),
        orderId: billData.orderId,
        merchant: merchant.name,
        user: user.name,
        amount: Number(billData.amount) / 1e7,
      });
    } catch (error: any) {
      return this.failure(error.message);
    }
  }
}

/**
 * Pay Bill (BNPL) Scenario
 */
export class PayBillScenario extends BaseScenario {
  type = 'bnpl-pay' as const;
  private billId: bigint;
  private userAccountName: string;

  constructor(billId: bigint, userAccountName: string) {
    super();
    this.billId = billId;
    this.userAccountName = userAccountName;
  }

  async canRun(): Promise<boolean> {
    try {
      // Check if bill exists and is payable
      const bill = await bnplActions.getBill(config.admin.accountName, this.billId);
      return bill.status.tag === 'Created';
    } catch {
      return false;
    }
  }

  async execute(): Promise<ScenarioResult> {
    try {
      await bnplActions.payBillBnpl({
        userAccountName: this.userAccountName,
        billId: this.billId,
      });

      return this.success({
        billId: this.billId.toString(),
        user: this.userAccountName,
      });
    } catch (error: any) {
      return this.failure(error.message);
    }
  }
}

/**
 * Repay Bill Scenario
 */
export class RepayBillScenario extends BaseScenario {
  type = 'bnpl-repay' as const;
  private billId: bigint;
  private userAccountName: string;

  constructor(billId: bigint, userAccountName: string) {
    super();
    this.billId = billId;
    this.userAccountName = userAccountName;
  }

  async canRun(): Promise<boolean> {
    try {
      // Check if bill exists and is repayable
      const bill = await bnplActions.getBill(config.admin.accountName, this.billId);
      return bill.status.tag === 'Paid' || bill.status.tag === 'Overdue';
    } catch {
      return false;
    }
  }

  async execute(): Promise<ScenarioResult> {
    try {
      await bnplActions.repayBill({
        userAccountName: this.userAccountName,
        billId: this.billId,
      });

      return this.success({
        billId: this.billId.toString(),
        user: this.userAccountName,
      });
    } catch (error: any) {
      return this.failure(error.message);
    }
  }
}

/**
 * Full BNPL Cycle - Create, Pay, and schedule Repay
 */
export class FullBnplCycleScenario extends BaseScenario {
  type = 'bnpl-create-bill' as const;

  async canRun(): Promise<boolean> {
    const merchant = accountPool.getRandomMerchant('approved');
    if (!merchant) return false;

    const user = accountPool.getRandomUser();
    if (!user) return false;

    // Check user has borrowing power
    const power = await bnplActions.getUserBorrowingPower(config.admin.accountName, user.address);
    return power.available_borrowing > toUsdcUnits(10);
  }

  async execute(): Promise<ScenarioResult> {
    try {
      const merchant = accountPool.getRandomMerchant('approved');
      const user = accountPool.getRandomUser();

      if (!merchant || !user) {
        return this.failure('No approved merchant or user with borrowing power');
      }

      // Check borrowing power
      const power = await bnplActions.getUserBorrowingPower(config.admin.accountName, user.address);
      const maxBorrow = fromUsdcUnits(power.available_borrowing);

      if (maxBorrow < 10) {
        return this.failure('Insufficient borrowing power');
      }

      // Generate bill with amount within borrowing power
      const maxAmount = Math.min(maxBorrow * 0.8, 200); // 80% of power, max $200
      const billData = generateBillData({
        minAmount: 1000,
        maxAmount: Math.floor(maxAmount * 100),
        merchantName: merchant.name,
      });

      // Step 1: Create bill
      logger.info(`BNPL Cycle: Creating bill ${billData.orderId}`);
      const billId = await bnplActions.createBill({
        merchantAccountName: merchant.name,
        merchantAddress: merchant.address,
        userAddress: user.address,
        amount: billData.amount,
        orderId: billData.orderId,
      });

      // Step 2: Pay bill with BNPL
      logger.info(`BNPL Cycle: Paying bill #${billId}`);
      await bnplActions.payBillBnpl({
        userAccountName: user.name,
        billId,
      });

      // Step 3: Randomly decide repayment timing
      // For now, we'll repay immediately (in production, schedule for later)
      const repayNow = randomInt(0, 100) < 70; // 70% chance to repay now

      if (repayNow) {
        logger.info(`BNPL Cycle: Repaying bill #${billId}`);
        await bnplActions.repayBill({
          userAccountName: user.name,
          billId,
        });
      } else {
        logger.info(`BNPL Cycle: Bill #${billId} scheduled for later repayment`);
        // Store for later repayment
        const activeBills = user.activeBills || [];
        activeBills.push(Number(billId));
        accountPool.updateUser(user.address, { activeBills });
      }

      return this.success({
        billId: billId.toString(),
        orderId: billData.orderId,
        merchant: merchant.name,
        user: user.name,
        amount: Number(billData.amount) / 1e7,
        repaid: repayNow,
      });
    } catch (error: any) {
      return this.failure(error.message);
    }
  }
}
