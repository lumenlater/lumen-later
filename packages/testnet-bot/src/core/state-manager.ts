/**
 * State Manager - Persists bot state to MongoDB
 */

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { goalTracker, type GoalProgress } from './goal-tracker.js';
import { accountPool, type AccountPool } from '../accounts/pool.js';

export interface BotState {
  lastUpdated: Date;
  isRunning: boolean;
  startedAt?: Date;
  dailyStats: {
    date: string;
    txCount: number;
    successCount: number;
    failureCount: number;
    scenarios: Record<string, number>;
  };
  accountPool: AccountPool;
  goals: GoalProgress;
  recentActivity: ActivityLog[];
}

export interface ActivityLog {
  timestamp: Date;
  scenario: string;
  success: boolean;
  details?: Record<string, any>;
  error?: string;
}

class StateManager {
  private mongoClient: any = null;
  private db: any = null;
  private isConnected = false;
  private recentActivity: ActivityLog[] = [];
  private dailyStats = {
    date: new Date().toISOString().split('T')[0],
    txCount: 0,
    successCount: 0,
    failureCount: 0,
    scenarios: {} as Record<string, number>,
  };
  private startedAt?: Date;

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Dynamic import to avoid bundling issues
      const { MongoClient } = await import('mongodb');

      this.mongoClient = new MongoClient(config.mongodb.uri);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(config.mongodb.dbName);
      this.isConnected = true;

      logger.success('Connected to MongoDB');

      // Restore state if available
      await this.restoreState();
    } catch (error: any) {
      logger.error(`Failed to connect to MongoDB: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.mongoClient) {
      await this.saveState();
      await this.mongoClient.close();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    }
  }

  /**
   * Save current state to MongoDB
   */
  async saveState(): Promise<void> {
    if (!this.isConnected) {
      logger.warn('MongoDB not connected, state not saved');
      return;
    }

    try {
      const goals = await goalTracker.getProgressData();
      const pool = accountPool.getPool();

      const state: BotState = {
        lastUpdated: new Date(),
        isRunning: true,
        startedAt: this.startedAt,
        dailyStats: this.dailyStats,
        accountPool: pool,
        goals,
        recentActivity: this.recentActivity.slice(-100), // Keep last 100
      };

      await this.db.collection('bot_state').updateOne(
        { _id: 'current' },
        { $set: state },
        { upsert: true }
      );
    } catch (error: any) {
      logger.error(`Failed to save state: ${error.message}`);
    }
  }

  /**
   * Restore state from MongoDB
   */
  async restoreState(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const state = await this.db.collection('bot_state').findOne({ _id: 'current' });

      if (state) {
        // Restore daily stats if same day
        const today = new Date().toISOString().split('T')[0];
        if (state.dailyStats?.date === today) {
          this.dailyStats = state.dailyStats;
          goalTracker.setDailyTxCount(this.dailyStats.txCount, today);
        }

        // Restore account pool
        if (state.accountPool) {
          accountPool.restorePool(state.accountPool);
        }

        // Restore recent activity
        if (state.recentActivity) {
          this.recentActivity = state.recentActivity;
        }

        logger.info('Restored previous bot state');
      }
    } catch (error: any) {
      logger.warn(`Could not restore state: ${error.message}`);
    }
  }

  /**
   * Record scenario execution
   */
  recordActivity(scenario: string, success: boolean, details?: Record<string, any>, error?: string): void {
    const activity: ActivityLog = {
      timestamp: new Date(),
      scenario,
      success,
      details,
      error,
    };

    this.recentActivity.unshift(activity);
    if (this.recentActivity.length > 100) {
      this.recentActivity.pop();
    }

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyStats.date !== today) {
      this.resetDailyStats();
    }

    this.dailyStats.txCount++;
    if (success) {
      this.dailyStats.successCount++;
    } else {
      this.dailyStats.failureCount++;
    }
    this.dailyStats.scenarios[scenario] = (this.dailyStats.scenarios[scenario] || 0) + 1;

    // Record in goal tracker
    goalTracker.recordTransaction();

    // Persist to MongoDB (async, non-blocking)
    this.saveActivityLog(activity);
  }

  /**
   * Save activity log to MongoDB
   */
  private async saveActivityLog(activity: ActivityLog): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.db.collection('bot_activity').insertOne({
        ...activity,
        date: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      logger.warn(`Failed to save activity log: ${error.message}`);
    }
  }

  /**
   * Reset daily stats
   */
  private resetDailyStats(): void {
    this.dailyStats = {
      date: new Date().toISOString().split('T')[0],
      txCount: 0,
      successCount: 0,
      failureCount: 0,
      scenarios: {},
    };
  }

  /**
   * Mark bot as started
   */
  markStarted(): void {
    this.startedAt = new Date();
  }

  /**
   * Get current state for API
   */
  async getState(): Promise<BotState> {
    const goals = await goalTracker.getProgressData();
    const pool = accountPool.getPool();

    return {
      lastUpdated: new Date(),
      isRunning: !!this.startedAt,
      startedAt: this.startedAt,
      dailyStats: this.dailyStats,
      accountPool: pool,
      goals,
      recentActivity: this.recentActivity,
    };
  }

  /**
   * Get activity history for a date range
   */
  async getActivityHistory(startDate: Date, endDate: Date): Promise<ActivityLog[]> {
    if (!this.isConnected) return [];

    try {
      const activities = await this.db.collection('bot_activity')
        .find({
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .sort({ timestamp: -1 })
        .limit(500)
        .toArray();

      return activities;
    } catch (error: any) {
      logger.error(`Failed to fetch activity history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get aggregated stats for dashboard
   */
  async getAggregatedStats(days: number = 7): Promise<any> {
    if (!this.isConnected) return null;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              scenario: '$scenario',
              success: '$success',
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.date': -1 },
        },
      ];

      return await this.db.collection('bot_activity').aggregate(pipeline).toArray();
    } catch (error: any) {
      logger.error(`Failed to get aggregated stats: ${error.message}`);
      return null;
    }
  }
}

export const stateManager = new StateManager();
