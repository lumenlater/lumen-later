#!/usr/bin/env node
/**
 * Run individual bootstrap steps
 * Usage: node dist/bin/bootstrap-step.js <step-number>
 *
 * Steps:
 *   1 - Ensure accounts exist (merchants + users)
 *   2 - Mint USDC to admin
 *   3 - Admin LP deposit
 *   4 - Distribute USDC to users
 *   5 - Users deposit to LP
 *   6 - Onboard merchants (create applications)
 *   7 - Approve merchants
 */

import { botEngine } from '../src/core/engine.js';
import { accountPool } from '../src/accounts/pool.js';
import { usdcActions, toUsdcUnits } from '../src/contracts/usdc-actions.js';
import { lpActions } from '../src/contracts/lp-actions.js';
import { bnplActions } from '../src/contracts/bnpl-actions.js';
import { merchantApi } from '../src/api/merchant-api.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/config/index.js';
import { generateMerchantApplication } from '@lumenlater/shared';
import { delay } from '../src/utils/delay.js';

const MERCHANT_COUNT = 5;
const USER_COUNT = 10;
const INITIAL_TVL = 50000;
const USDC_PER_USER = 10000;

async function step1_ensureAccounts() {
  logger.header('Step 1: Ensure Accounts');
  await accountPool.ensureMerchants(MERCHANT_COUNT);
  await accountPool.ensureUsers(USER_COUNT);
  const stats = accountPool.getStats();
  logger.success(`Created ${stats?.totalMerchants} merchants, ${stats?.totalUsers} users`);
}

async function step2_mintUsdc() {
  logger.header('Step 2: Mint USDC to Admin');
  const pool = accountPool.getPool();
  const totalNeeded = INITIAL_TVL + (USDC_PER_USER * USER_COUNT) + 10000;

  await usdcActions.mint({
    adminAccountName: config.admin.accountName,
    toAddress: pool.admin.address,
    amount: toUsdcUnits(totalNeeded),
  });
  logger.success(`Minted $${totalNeeded} USDC`);
}

async function step3_adminLpDeposit() {
  logger.header('Step 3: Admin LP Deposit');
  await lpActions.deposit({
    accountName: config.admin.accountName,
    amount: toUsdcUnits(INITIAL_TVL),
  });
  logger.success(`Deposited $${INITIAL_TVL} to LP`);
}

async function step4_distributeUsdc() {
  logger.header('Step 4: Distribute USDC to Users');
  const pool = accountPool.getPool();

  for (const user of pool.users) {
    logger.info(`Transferring to ${user.name}...`);
    await usdcActions.transfer({
      fromAccountName: config.admin.accountName,
      toAddress: user.address,
      amount: toUsdcUnits(USDC_PER_USER),
    });
    await delay(500);
  }
  logger.success(`Distributed $${USDC_PER_USER} to ${pool.users.length} users`);
}

async function step5_usersLpDeposit() {
  logger.header('Step 5: Users LP Deposit');
  const pool = accountPool.getPool();
  const depositAmount = Math.floor(USDC_PER_USER * 0.8);

  for (const user of pool.users) {
    logger.info(`${user.name} depositing...`);
    await lpActions.deposit({
      accountName: user.name,
      amount: toUsdcUnits(depositAmount),
    });
    await delay(500);
  }
  logger.success(`${pool.users.length} users deposited $${depositAmount} each`);
}

async function step6_onboardMerchants() {
  logger.header('Step 6: Onboard Merchants');
  const pool = accountPool.getPool();

  for (const merchant of pool.merchants) {
    if (merchant.mongoId) {
      logger.info(`${merchant.name} already onboarded, skipping...`);
      continue;
    }

    logger.info(`Creating application for ${merchant.name}...`);
    const appData = generateMerchantApplication();
    const { mongoId } = await merchantApi.createApplication(merchant.address, appData);

    logger.info(`Enrolling ${merchant.name} on blockchain...`);
    await bnplActions.enrollMerchant({
      merchantAccountName: merchant.name,
      merchantAddress: merchant.address,
      mongoId,
    });

    accountPool.updateMerchant(merchant.address, {
      mongoId,
      merchantStatus: 'pending',
    });

    await delay(500);
  }
  logger.success('Merchants onboarded');
}

async function step7_approveMerchants() {
  logger.header('Step 7: Approve Merchants');
  const pool = accountPool.getPool();

  for (const merchant of pool.merchants) {
    if (merchant.merchantStatus === 'approved') {
      logger.info(`${merchant.name} already approved, skipping...`);
      continue;
    }

    if (merchant.mongoId) {
      logger.info(`Approving ${merchant.name} in API...`);
      await merchantApi.updateApplicationStatus(merchant.mongoId, 'APPROVED');
    }

    logger.info(`Approving ${merchant.name} on blockchain...`);
    await bnplActions.updateMerchantStatus({
      adminAccountName: config.admin.accountName,
      merchantAddress: merchant.address,
      newStatus: 'Approved',
    });

    accountPool.updateMerchant(merchant.address, {
      merchantStatus: 'approved',
    });

    await delay(500);
  }
  logger.success('Merchants approved');
}

const steps: Record<string, () => Promise<void>> = {
  '1': step1_ensureAccounts,
  '2': step2_mintUsdc,
  '3': step3_adminLpDeposit,
  '4': step4_distributeUsdc,
  '5': step5_usersLpDeposit,
  '6': step6_onboardMerchants,
  '7': step7_approveMerchants,
};

async function main() {
  const stepArg = process.argv[2];

  if (!stepArg || !steps[stepArg]) {
    console.log(`
Usage: node dist/bin/bootstrap-step.js <step>

Steps:
  1 - Ensure accounts exist (merchants + users)
  2 - Mint USDC to admin
  3 - Admin LP deposit
  4 - Distribute USDC to users
  5 - Users deposit to LP
  6 - Onboard merchants (requires web server)
  7 - Approve merchants (requires web server)

Example: node dist/bin/bootstrap-step.js 6
`);
    process.exit(1);
  }

  try {
    await botEngine.initialize();
    await steps[stepArg]();
    await botEngine.stop();
    process.exit(0);
  } catch (error: any) {
    logger.error(`Step ${stepArg} failed: ${error.message}`);
    await botEngine.stop();
    process.exit(1);
  }
}

main();
