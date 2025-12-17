/**
 * Goal Tracker - Tracks progress toward configured goals
 */

import { config } from '../config/index.js';
import { lpActions } from '../contracts/lp-actions.js';
import { bnplActions } from '../contracts/bnpl-actions.js';
import { fromUsdcUnits } from '../contracts/usdc-actions.js';
import { accountPool } from '../accounts/pool.js';
import { logger } from '../utils/logger.js';

export interface GoalProgress {
  tvl: {
    current: number;
    target: number;
    percentage: number;
  };
  merchants: {
    current: number;
    target: number;
    percentage: number;
  };
  users: {
    current: number;
    target: number;
    percentage: number;
  };
  dailyTx: {
    current: number;
    target: number;
    percentage: number;
  };
}

export interface GoalAction {
  priority: number;
  scenario: string;
  reason: string;
}

class GoalTracker {
  private dailyTxCount = 0;
  private lastResetDate: string = '';

  /**
   * Get current progress toward all goals
   */
  async getProgress(): Promise<GoalProgress> {
    // Reset daily TX count at midnight
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastResetDate) {
      this.dailyTxCount = 0;
      this.lastResetDate = today;
    }

    // Fetch current TVL
    let currentTvl = 0;
    try {
      const totalUnderlying = await lpActions.getTotalUnderlying(config.admin.accountName);
      currentTvl = fromUsdcUnits(totalUnderlying);
    } catch (error) {
      logger.warn('Could not fetch TVL');
    }

    // Get account counts
    const stats = accountPool.getStats();
    const currentMerchants = stats?.approvedMerchants || 0;
    const currentUsers = stats?.totalUsers || 0;

    return {
      tvl: {
        current: currentTvl,
        target: config.goals.tvl,
        percentage: Math.min((currentTvl / config.goals.tvl) * 100, 100),
      },
      merchants: {
        current: currentMerchants,
        target: config.goals.merchants,
        percentage: Math.min((currentMerchants / config.goals.merchants) * 100, 100),
      },
      users: {
        current: currentUsers,
        target: config.goals.users,
        percentage: Math.min((currentUsers / config.goals.users) * 100, 100),
      },
      dailyTx: {
        current: this.dailyTxCount,
        target: config.goals.dailyTx,
        percentage: Math.min((this.dailyTxCount / config.goals.dailyTx) * 100, 100),
      },
    };
  }

  /**
   * Record a transaction
   */
  recordTransaction(): void {
    this.dailyTxCount++;
  }

  /**
   * Determine which scenario to run based on current progress
   */
  async getRecommendedAction(): Promise<GoalAction | null> {
    const progress = await this.getProgress();
    const actions: GoalAction[] = [];

    // Check if we've hit daily TX limit
    if (progress.dailyTx.percentage >= 100) {
      logger.info('Daily TX goal reached, pausing...');
      return null;
    }

    // Priority 1: Need more merchants
    if (progress.merchants.percentage < progress.users.percentage) {
      actions.push({
        priority: 1,
        scenario: 'bootstrap', // Bootstrap creates merchants
        reason: `Merchants behind (${progress.merchants.current}/${progress.merchants.target})`,
      });
    }

    // Priority 2: Need more TVL
    if (progress.tvl.percentage < 50) {
      actions.push({
        priority: 2,
        scenario: 'lp-deposit',
        reason: `TVL low (${progress.tvl.current.toFixed(2)}/${progress.tvl.target})`,
      });
    }

    // Priority 3: Need more transactions (run BNPL cycles)
    if (progress.dailyTx.percentage < 80) {
      actions.push({
        priority: 3,
        scenario: 'bnpl-cycle',
        reason: `Daily TX (${progress.dailyTx.current}/${progress.dailyTx.target})`,
      });
    }

    // Priority 4: Balance LP operations
    if (progress.tvl.percentage > 80) {
      // If TVL is high, allow some withdrawals
      actions.push({
        priority: 4,
        scenario: Math.random() < 0.3 ? 'lp-withdraw' : 'lp-deposit',
        reason: 'Balancing LP operations',
      });
    }

    // Default to BNPL cycle for generating transactions
    if (actions.length === 0) {
      actions.push({
        priority: 5,
        scenario: 'bnpl-cycle',
        reason: 'Default transaction generation',
      });
    }

    // Sort by priority and return highest
    actions.sort((a, b) => a.priority - b.priority);
    return actions[0];
  }

  /**
   * Log current progress summary
   */
  async logProgress(): Promise<void> {
    const progress = await this.getProgress();

    logger.header('Goal Progress');
    logger.info(`TVL: $${progress.tvl.current.toFixed(2)} / $${progress.tvl.target} (${progress.tvl.percentage.toFixed(1)}%)`);
    logger.info(`Merchants: ${progress.merchants.current} / ${progress.merchants.target} (${progress.merchants.percentage.toFixed(1)}%)`);
    logger.info(`Users: ${progress.users.current} / ${progress.users.target} (${progress.users.percentage.toFixed(1)}%)`);
    logger.info(`Daily TX: ${progress.dailyTx.current} / ${progress.dailyTx.target} (${progress.dailyTx.percentage.toFixed(1)}%)`);
    logger.separator();
  }

  /**
   * Get progress data for API/dashboard
   */
  async getProgressData(): Promise<GoalProgress> {
    return this.getProgress();
  }

  /**
   * Set daily TX count (for restoring state)
   */
  setDailyTxCount(count: number, date: string): void {
    this.dailyTxCount = count;
    this.lastResetDate = date;
  }
}

export const goalTracker = new GoalTracker();
