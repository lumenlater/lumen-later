#!/usr/bin/env node
/**
 * Show current bot status
 */

import { botEngine } from '../src/core/engine.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  try {
    await botEngine.initialize();
    await botEngine.showStatus();
    await botEngine.stop();
    process.exit(0);
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
