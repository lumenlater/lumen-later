/**
 * Lumen Later Testnet Bot
 *
 * Automated transaction generator for testing the BNPL protocol
 */

// Core exports
export { botEngine, scheduler, goalTracker, stateManager } from './core/index.js';
export type { GoalProgress, GoalAction, BotState, ActivityLog } from './core/index.js';

// Scenario exports
export { scenarios, createScenario } from './scenarios/index.js';
export { BaseScenario, type ScenarioType, type ScenarioResult } from './scenarios/base.js';

// Account management
export { accountPool, type AccountPool, type MerchantAccount, type UserAccount } from './accounts/pool.js';

// Contract actions
export { bnplActions } from './contracts/bnpl-actions.js';
export { lpActions } from './contracts/lp-actions.js';
export { usdcActions, toUsdcUnits, fromUsdcUnits } from './contracts/usdc-actions.js';

// Utilities
export { logger } from './utils/logger.js';
export { delay, RateLimiter } from './utils/delay.js';

// Config
export { config, type BotConfig } from './config/index.js';
