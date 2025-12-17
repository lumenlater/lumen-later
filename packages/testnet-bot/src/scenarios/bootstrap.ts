/**
 * Bootstrap scenario - Initial setup for fresh contract deployment
 */

import { BaseScenario, type ScenarioResult } from './base.js';
import { accountPool } from '../accounts/pool.js';
import { usdcActions, toUsdcUnits } from '../contracts/usdc-actions.js';
import { lpActions } from '../contracts/lp-actions.js';
import { bnplActions } from '../contracts/bnpl-actions.js';
import { merchantApi } from '../api/merchant-api.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { generateMerchantApplication } from '@lumenlater/shared';
import { delay } from '../utils/delay.js';

export interface BootstrapOptions {
  merchantCount: number;
  userCount: number;
  initialTvl: number; // in dollars
  usdcPerUser: number; // in dollars
}

const DEFAULT_OPTIONS: BootstrapOptions = {
  merchantCount: 5,
  userCount: 10,
  initialTvl: 50000,
  usdcPerUser: 1000,
};

export class BootstrapScenario extends BaseScenario {
  type = 'bootstrap' as const;
  private options: BootstrapOptions;

  constructor(options: Partial<BootstrapOptions> = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async canRun(): Promise<boolean> {
    // Bootstrap can always run (but should check if already bootstrapped)
    return true;
  }

  async execute(): Promise<ScenarioResult> {
    try {
      logger.header('Bootstrap Scenario');
      const pool = accountPool.getPool();

      // Step 1: Ensure accounts exist
      logger.separator();
      logger.info('Step 1: Ensuring accounts exist...');

      await accountPool.ensureMerchants(this.options.merchantCount);
      await accountPool.ensureUsers(this.options.userCount);

      // Step 2: Mint USDC to admin for initial liquidity
      logger.separator();
      logger.info('Step 2: Minting initial USDC...');

      const totalUsdcNeeded =
        this.options.initialTvl +
        this.options.usdcPerUser * this.options.userCount +
        10000; // buffer

      await usdcActions.mint({
        adminAccountName: config.admin.accountName,
        toAddress: pool.admin.address,
        amount: toUsdcUnits(totalUsdcNeeded),
      });

      await delay(2000); // Wait for tx confirmation

      // Step 3: Initial LP deposit (TVL)
      logger.separator();
      logger.info('Step 3: Initial LP deposit for TVL...');

      await lpActions.deposit({
        accountName: config.admin.accountName,
        amount: toUsdcUnits(this.options.initialTvl),
      });

      await delay(2000);

      // Step 4: Distribute USDC to users (transfer from admin, not mint)
      logger.separator();
      logger.info('Step 4: Distributing USDC to users...');

      for (const user of pool.users) {
        await usdcActions.transfer({
          fromAccountName: config.admin.accountName,
          toAddress: user.address,
          amount: toUsdcUnits(this.options.usdcPerUser),
        });
        await delay(1000);
      }

      // Step 5: Users deposit to LP pool (for collateral)
      logger.separator();
      logger.info('Step 5: Users depositing to LP pool...');

      for (const user of pool.users) {
        const depositAmount = Math.floor(this.options.usdcPerUser * 0.8); // 80%
        await lpActions.deposit({
          accountName: user.name,
          amount: toUsdcUnits(depositAmount),
        });
        await delay(1000);
      }

      // Step 6: Onboard merchants
      logger.separator();
      logger.info('Step 6: Onboarding merchants...');

      for (const merchant of pool.merchants) {
        // Create application in MongoDB
        const appData = generateMerchantApplication();
        const { mongoId } = await merchantApi.createApplication(
          merchant.address,
          appData
        );

        // Enroll on blockchain
        await bnplActions.enrollMerchant({
          merchantAccountName: merchant.name,
          merchantAddress: merchant.address,
          mongoId,
        });

        accountPool.updateMerchant(merchant.address, {
          mongoId,
          merchantStatus: 'pending',
        });

        await delay(1000);
      }

      // Step 7: Approve merchants
      logger.separator();
      logger.info('Step 7: Approving merchants...');

      for (const merchant of pool.merchants) {
        // Update MongoDB status
        if (merchant.mongoId) {
          await merchantApi.updateApplicationStatus(merchant.mongoId, 'APPROVED');
        }

        // Update blockchain status
        await bnplActions.updateMerchantStatus({
          adminAccountName: config.admin.accountName,
          merchantAddress: merchant.address,
          newStatus: 'Approved',
        });

        accountPool.updateMerchant(merchant.address, {
          merchantStatus: 'approved',
        });

        await delay(1000);
      }

      logger.separator();
      logger.success('Bootstrap completed!');

      const stats = accountPool.getStats();
      logger.info(`Merchants: ${stats?.approvedMerchants}/${stats?.totalMerchants} approved`);
      logger.info(`Users: ${stats?.totalUsers} with LP deposits`);

      return this.success({
        merchantsCreated: this.options.merchantCount,
        usersCreated: this.options.userCount,
        initialTvl: this.options.initialTvl,
      });
    } catch (error: any) {
      return this.failure(error.message);
    }
  }
}
