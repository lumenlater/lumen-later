#!/usr/bin/env node
/**
 * Run bootstrap scenario for fresh contract deployment
 */

import { botEngine } from '../src/core/engine.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.header('Lumen Later Bootstrap');
  logger.info('This will set up the testnet with initial data');
  logger.separator();

  try {
    await botEngine.runBootstrap();
    await botEngine.stop();

    logger.separator();
    logger.success('Bootstrap complete! You can now run the bot.');
    process.exit(0);
  } catch (error: any) {
    logger.error(`Bootstrap failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
