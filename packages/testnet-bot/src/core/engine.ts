/**
 * Bot Engine - Main orchestrator for the testnet bot
 */

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { scheduler } from './scheduler.js';
import { goalTracker } from './goal-tracker.js';
import { stateManager } from './state-manager.js';
import { accountPool } from '../accounts/pool.js';
import { createScenario, scenarios } from '../scenarios/index.js';
import { randomInt } from '@lumenlater/shared';

export interface EngineOptions {
  autoStart?: boolean;
  skipBootstrap?: boolean;
}

class BotEngine {
  private isInitialized = false;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  /**
   * Initialize the bot engine
   */
  async initialize(options: EngineOptions = {}): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Bot engine already initialized');
      return;
    }

    logger.header('Initializing Lumen Later Testnet Bot');
    logger.separator();

    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await stateManager.connect();

    // Initialize account pool
    logger.info('Initializing account pool...');
    await accountPool.initialize();

    this.isInitialized = true;
    logger.success('Bot engine initialized');
    logger.separator();

    // Show current progress
    await goalTracker.logProgress();

    // Auto-start if requested
    if (options.autoStart) {
      await this.start();
    }
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Bot engine not initialized. Call initialize() first.');
    }

    logger.header('Starting Bot');

    stateManager.markStarted();

    // Start the scheduler
    scheduler.start(async () => {
      await this.executeScenario();
    });

    logger.success('Bot is now running');

    // Save state periodically
    setInterval(() => {
      stateManager.saveState();
    }, 60000); // Every minute
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    logger.info('Stopping bot...');

    scheduler.stop();
    await stateManager.saveState();
    await stateManager.disconnect();

    logger.success('Bot stopped');
  }

  /**
   * Execute a scenario based on current goals
   */
  private async executeScenario(): Promise<void> {
    try {
      // Get recommended action based on goals
      const action = await goalTracker.getRecommendedAction();

      if (!action) {
        logger.info('No action needed at this time');
        return;
      }

      logger.info(`Executing: ${action.scenario} (${action.reason})`);

      // Create and run the scenario
      const scenario = createScenario(action.scenario);

      // Check if scenario can run
      const canRun = await scenario.canRun();
      if (!canRun) {
        logger.warn(`Scenario ${action.scenario} cannot run, trying alternative...`);
        await this.executeAlternativeScenario(action.scenario);
        return;
      }

      // Execute the scenario
      const result = await scenario.execute();

      if (result.success) {
        this.consecutiveFailures = 0;
        logger.success(`Scenario ${result.type} completed successfully`);
        stateManager.recordActivity(result.type, true, result.details, undefined, result.volume);
      } else {
        this.consecutiveFailures++;
        logger.error(`Scenario ${result.type} failed: ${result.error}`);
        stateManager.recordActivity(result.type, false, result.details, result.error, result.volume);

        // Check for too many failures
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          logger.error(`Too many consecutive failures (${this.consecutiveFailures}), pausing...`);
          scheduler.pause();

          // Auto-resume after 5 minutes
          setTimeout(() => {
            this.consecutiveFailures = 0;
            scheduler.resume();
            logger.info('Auto-resumed after failure cooldown');
          }, 5 * 60 * 1000);
        }
      }
    } catch (error: any) {
      this.consecutiveFailures++;
      logger.error(`Scenario execution error: ${error.message}`);
      stateManager.recordActivity('unknown', false, undefined, error.message);
    }
  }

  /**
   * Try an alternative scenario when primary cannot run
   */
  private async executeAlternativeScenario(excludeType: string): Promise<void> {
    const scenarioTypes = Object.keys(scenarios).filter(t => t !== excludeType && t !== 'bootstrap');

    // Shuffle and try each
    for (let i = scenarioTypes.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [scenarioTypes[i], scenarioTypes[j]] = [scenarioTypes[j], scenarioTypes[i]];
    }

    for (const type of scenarioTypes) {
      const scenario = createScenario(type);
      const canRun = await scenario.canRun();

      if (canRun) {
        logger.info(`Running alternative scenario: ${type}`);
        const result = await scenario.execute();

        if (result.success) {
          stateManager.recordActivity(result.type, true, result.details, undefined, result.volume);
        } else {
          stateManager.recordActivity(result.type, false, result.details, result.error, result.volume);
        }
        return;
      }
    }

    logger.warn('No alternative scenarios available');
  }

  /**
   * Run bootstrap scenario
   */
  async runBootstrap(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    logger.header('Running Bootstrap Scenario');

    const bootstrap = createScenario('bootstrap');
    const result = await bootstrap.execute();

    if (result.success) {
      logger.success('Bootstrap completed');
      stateManager.recordActivity('bootstrap', true, result.details, undefined, result.volume);
    } else {
      logger.error(`Bootstrap failed: ${result.error}`);
      stateManager.recordActivity('bootstrap', false, result.details, result.error, result.volume);
    }

    await stateManager.saveState();
  }

  /**
   * Execute a specific scenario manually
   */
  async runScenario(type: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Bot engine not initialized');
    }

    logger.info(`Manually executing scenario: ${type}`);

    const scenario = createScenario(type);
    const result = await scenario.execute();

    if (result.success) {
      logger.success(`Scenario ${result.type} completed`);
      stateManager.recordActivity(result.type, true, result.details, undefined, result.volume);
    } else {
      logger.error(`Scenario ${result.type} failed: ${result.error}`);
      stateManager.recordActivity(result.type, false, result.details, result.error, result.volume);
    }
  }

  /**
   * Get current bot status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    scheduler: ReturnType<typeof scheduler.getStatus>;
    goals: Awaited<ReturnType<typeof goalTracker.getProgressData>>;
    state: Awaited<ReturnType<typeof stateManager.getState>>;
  }> {
    return {
      initialized: this.isInitialized,
      scheduler: scheduler.getStatus(),
      goals: await goalTracker.getProgressData(),
      state: await stateManager.getState(),
    };
  }

  /**
   * Show status summary in console
   */
  async showStatus(): Promise<void> {
    const status = await this.getStatus();

    logger.header('Bot Status');
    logger.info(`Initialized: ${status.initialized}`);
    logger.info(`Running: ${status.scheduler.isRunning}`);
    logger.info(`Paused: ${status.scheduler.isPaused}`);
    logger.info(`Active Hours: ${status.scheduler.isWithinActiveHours}`);
    logger.separator();

    await goalTracker.logProgress();

    const state = status.state;
    logger.info(`Today's Stats:`);
    logger.info(`  Transactions: ${state.dailyStats.txCount}`);
    logger.info(`  Success: ${state.dailyStats.successCount}`);
    logger.info(`  Failures: ${state.dailyStats.failureCount}`);

    if (Object.keys(state.dailyStats.scenarios).length > 0) {
      logger.info(`  By Scenario:`);
      for (const [scenario, count] of Object.entries(state.dailyStats.scenarios)) {
        logger.info(`    ${scenario}: ${count}`);
      }
    }
  }

  /**
   * Pause the bot
   */
  pause(): void {
    scheduler.pause();
    logger.info('Bot paused');
  }

  /**
   * Resume the bot
   */
  resume(): void {
    scheduler.resume();
    logger.info('Bot resumed');
  }
}

export const botEngine = new BotEngine();
