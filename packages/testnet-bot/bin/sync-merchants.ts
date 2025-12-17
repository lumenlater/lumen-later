#!/usr/bin/env node
/**
 * Sync merchant status - mark all pool merchants as approved
 * Use when merchants were approved manually on blockchain
 */

import { botEngine } from '../src/core/engine.js';
import { accountPool } from '../src/accounts/pool.js';
import { merchantApi } from '../src/api/merchant-api.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.header('Sync Merchant Status');

  try {
    await botEngine.initialize();
    const pool = accountPool.getPool();

    // Get all applications from API
    const { applications } = await merchantApi.listApplications();
    logger.info(`Found ${applications.length} applications in MongoDB`);

    for (const merchant of pool.merchants) {
      logger.separator();
      logger.info(`Processing ${merchant.name} (${merchant.address.slice(0, 8)}...)`)

      // Find matching application by address
      const app = applications.find((a: any) => a.applicantAddress === merchant.address);

      if (!app) {
        logger.warn(`No application found for ${merchant.name}`);
        // Still mark as approved in pool since blockchain is approved
        accountPool.updateMerchant(merchant.address, {
          merchantStatus: 'approved',
        });
        logger.info(`Pool updated to approved (no mongoId)`);
        continue;
      }

      const mongoId = app.id;
      logger.info(`Found application: ${mongoId} (status: ${app.status})`);

      // Update pool with mongoId and status
      accountPool.updateMerchant(merchant.address, {
        mongoId,
        merchantStatus: 'approved',
      });
      logger.success(`Pool updated with mongoId: ${mongoId}`);
    }

    const stats = accountPool.getStats();
    logger.separator();
    logger.success(`Sync complete: ${stats?.approvedMerchants}/${stats?.totalMerchants} merchants approved`);

    // Verify pool state before save
    const verifyPool = accountPool.getPool();
    logger.info('Verifying pool before save:');
    verifyPool.merchants.forEach(m => {
      logger.info(`  ${m.name}: status=${m.merchantStatus}, mongoId=${m.mongoId || 'null'}`);
    });

    await botEngine.stop();
    process.exit(0);
  } catch (error: any) {
    logger.error(`Sync failed: ${error.message}`);
    console.error(error);
    await botEngine.stop();
    process.exit(1);
  }
}

main();
