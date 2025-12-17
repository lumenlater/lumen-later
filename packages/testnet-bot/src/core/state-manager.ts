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
    volume: number; // Daily volume in USDC
    scenarios: Record<string, number>;
  };
  totalVolume: number; // Cumulative volume in USDC
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
  volume?: number; // Transaction volume in USDC (if applicable)
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
    volume: 0,
    scenarios: {} as Record<string, number>,
  };
  private totalVolume = 0;
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
   * Uses flattened field names to match Prisma schema
   */
  async saveState(): Promise<void> {
    if (!this.isConnected) {
      logger.warn('MongoDB not connected, state not saved');
      return;
    }

    try {
      const goals = await goalTracker.getProgressData();
      const pool = accountPool.getPool();

      // Flattened structure matching Prisma schema
      const state = {
        updatedAt: new Date(),
        isRunning: true,
        startedAt: this.startedAt,
        // Flattened daily stats
        dailyStatsDate: this.dailyStats.date,
        dailyTxCount: this.dailyStats.txCount,
        dailySuccessCount: this.dailyStats.successCount,
        dailyFailureCount: this.dailyStats.failureCount,
        dailyVolume: this.dailyStats.volume,
        dailyScenarios: this.dailyStats.scenarios,
        // Cumulative stats
        totalVolume: this.totalVolume,
        // JSON fields
        accountPool: pool,
        goalProgress: goals,
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
   * Reads flattened field names matching Prisma schema
   */
  async restoreState(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const state = await this.db.collection('bot_state').findOne({ _id: 'current' });

      if (state) {
        // Restore daily stats if same day (handle both old and new formats)
        const today = new Date().toISOString().split('T')[0];
        const stateDate = state.dailyStatsDate || state.dailyStats?.date;

        if (stateDate === today) {
          this.dailyStats = {
            date: stateDate,
            txCount: state.dailyTxCount ?? state.dailyStats?.txCount ?? 0,
            successCount: state.dailySuccessCount ?? state.dailyStats?.successCount ?? 0,
            failureCount: state.dailyFailureCount ?? state.dailyStats?.failureCount ?? 0,
            volume: state.dailyVolume ?? state.dailyStats?.volume ?? 0,
            scenarios: state.dailyScenarios ?? state.dailyStats?.scenarios ?? {},
          };
          goalTracker.setDailyTxCount(this.dailyStats.txCount, today);
        }

        // Restore total volume
        this.totalVolume = state.totalVolume ?? 0;

        // Restore account pool
        if (state.accountPool) {
          accountPool.restorePool(state.accountPool);
        }

        logger.info('Restored previous bot state');
      }
    } catch (error: any) {
      logger.warn(`Could not restore state: ${error.message}`);
    }
  }

  /**
   * Record scenario execution
   * @param volume - Transaction volume in USDC (optional)
   */
  recordActivity(scenario: string, success: boolean, details?: Record<string, any>, error?: string, volume?: number): void {
    const activity: ActivityLog = {
      timestamp: new Date(),
      scenario,
      success,
      details,
      error,
      volume,
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

    // Update volume if provided
    if (volume && volume > 0) {
      this.dailyStats.volume += volume;
      this.totalVolume += volume;
    }

    // Record in goal tracker
    goalTracker.recordTransaction();

    // Persist to MongoDB (async, non-blocking)
    this.saveActivityLog(activity);
  }

  /**
   * Save activity log to MongoDB
   * Uses 'bot_activities' collection to match Prisma schema
   */
  private async saveActivityLog(activity: ActivityLog): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.db.collection('bot_activities').insertOne({
        createdAt: activity.timestamp,
        date: new Date().toISOString().split('T')[0],
        scenario: activity.scenario,
        success: activity.success,
        details: activity.details,
        error: activity.error,
        volume: activity.volume,
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
      volume: 0,
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
      totalVolume: this.totalVolume,
      accountPool: pool,
      goals,
      recentActivity: this.recentActivity,
    };
  }

  /**
   * Check remote control state from MongoDB
   * Returns true if bot should be running, false if paused/stopped
   */
  async checkRemoteControlState(): Promise<boolean> {
    if (!this.isConnected) return true; // Default to running if not connected

    try {
      const state = await this.db.collection('bot_state').findOne({ _id: 'current' });
      return state?.isRunning ?? true;
    } catch (error: any) {
      logger.warn(`Failed to check remote state: ${error.message}`);
      return true; // Default to running on error
    }
  }

  /**
   * Get activity history for a date range
   */
  async getActivityHistory(startDate: Date, endDate: Date): Promise<ActivityLog[]> {
    if (!this.isConnected) return [];

    try {
      const activities = await this.db.collection('bot_activities')
        .find({
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .sort({ createdAt: -1 })
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
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
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

      return await this.db.collection('bot_activities').aggregate(pipeline).toArray();
    } catch (error: any) {
      logger.error(`Failed to get aggregated stats: ${error.message}`);
      return null;
    }
  }
}

export const stateManager = new StateManager();
