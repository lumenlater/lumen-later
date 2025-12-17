/**
 * Scheduler - Random interval task scheduling
 */

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { randomInt } from '@lumenlater/shared';

export type SchedulerCallback = () => Promise<void>;

class Scheduler {
  private isRunning = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private callback: SchedulerCallback | null = null;
  private isPaused = false;

  /**
   * Start the scheduler with a callback
   */
  start(callback: SchedulerCallback): void {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    this.callback = callback;
    this.isRunning = true;
    logger.success('Scheduler started');

    this.scheduleNext();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    logger.info('Scheduler stopped');
  }

  /**
   * Pause the scheduler
   */
  pause(): void {
    this.isPaused = true;
    logger.info('Scheduler paused');
  }

  /**
   * Resume the scheduler
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      logger.info('Scheduler resumed');
      if (this.isRunning && !this.timeoutId) {
        this.scheduleNext();
      }
    }
  }

  /**
   * Check if within active hours
   */
  private isWithinActiveHours(): boolean {
    const { start, end } = config.schedule.activeHours;
    const now = new Date();
    const currentHour = now.getHours();

    // Handle overnight ranges (e.g., 22:00 - 06:00)
    if (start > end) {
      return currentHour >= start || currentHour < end;
    }

    return currentHour >= start && currentHour < end;
  }

  /**
   * Get random interval in milliseconds
   */
  private getRandomInterval(): number {
    const { minInterval, maxInterval } = config.schedule;
    return randomInt(minInterval, maxInterval);
  }

  /**
   * Calculate wait time until next active period
   */
  private getWaitUntilActive(): number {
    const { start } = config.schedule.activeHours;
    const now = new Date();
    const currentHour = now.getHours();

    let hoursUntilActive: number;
    if (currentHour < start) {
      hoursUntilActive = start - currentHour;
    } else {
      hoursUntilActive = 24 - currentHour + start;
    }

    // Add some randomness (0-30 minutes)
    const additionalMinutes = randomInt(0, 30);
    return (hoursUntilActive * 60 + additionalMinutes) * 60 * 1000;
  }

  /**
   * Schedule the next execution
   */
  private scheduleNext(): void {
    if (!this.isRunning || this.isPaused) return;

    let delay: number;

    if (!this.isWithinActiveHours()) {
      delay = this.getWaitUntilActive();
      logger.info(`Outside active hours, waiting ${Math.floor(delay / 60000)} minutes`);
    } else {
      delay = this.getRandomInterval();
      logger.info(`Next execution in ${Math.floor(delay / 1000)} seconds`);
    }

    this.timeoutId = setTimeout(async () => {
      if (!this.isRunning || this.isPaused || !this.callback) return;

      try {
        // Double-check active hours before executing
        if (this.isWithinActiveHours()) {
          await this.callback();
        } else {
          logger.info('Skipping execution - outside active hours');
        }
      } catch (error: any) {
        logger.error(`Scheduler callback error: ${error.message}`);
      }

      // Schedule next execution
      this.scheduleNext();
    }, delay);
  }

  /**
   * Execute immediately (for manual triggers)
   */
  async executeNow(): Promise<void> {
    if (!this.callback) {
      logger.warn('No callback registered');
      return;
    }

    try {
      await this.callback();
    } catch (error: any) {
      logger.error(`Manual execution error: ${error.message}`);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    isWithinActiveHours: boolean;
    activeHours: { start: number; end: number };
    intervalRange: { min: number; max: number };
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isWithinActiveHours: this.isWithinActiveHours(),
      activeHours: config.schedule.activeHours,
      intervalRange: {
        min: config.schedule.minInterval / 1000,
        max: config.schedule.maxInterval / 1000,
      },
    };
  }
}

export const scheduler = new Scheduler();
