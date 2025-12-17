#!/usr/bin/env node
/**
 * Run the testnet bot
 */

import { botEngine } from '../src/core/engine.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.header('Lumen Later Testnet Bot');
  logger.info('Starting bot...');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('\\nReceived SIGINT, shutting down...');
    await botEngine.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('\\nReceived SIGTERM, shutting down...');
    await botEngine.stop();
    process.exit(0);
  });

  try {
    await botEngine.initialize({ autoStart: true });

    // Keep process alive
    await new Promise(() => {});
  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
