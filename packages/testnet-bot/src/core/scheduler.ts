/**
 * Scheduler - Random interval task scheduling with remote control support
 */

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { randomInt } from '@lumenlater/shared';
import { stateManager } from './state-manager.js';

// Remote control polling interval (30 seconds)
const REMOTE_CONTROL_POLL_INTERVAL = 30 * 1000;

export type SchedulerCallback = () => Promise<void>;

class Scheduler {
  private isRunning = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private callback: SchedulerCallback | null = null;
  private isPaused = false;
  private remoteControlIntervalId: NodeJS.Timeout | null = null;

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

    // Start remote control polling
    this.startRemoteControlPolling();

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
    // Stop remote control polling
    this.stopRemoteControlPolling();
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
      // Always schedule next when resuming (previous timeout may have expired while paused)
      if (this.isRunning) {
        // Clear any stale timeout reference
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
        this.scheduleNext();
      }
    }
  }

  /**
   * Start remote control polling
   * Periodically checks MongoDB for pause/resume commands from admin UI
   */
  private startRemoteControlPolling(): void {
    if (this.remoteControlIntervalId) return;

    logger.info('Remote control polling started');

    this.remoteControlIntervalId = setInterval(async () => {
      await this.checkRemoteControlState();
    }, REMOTE_CONTROL_POLL_INTERVAL);

    // Also check immediately on start
    this.checkRemoteControlState();
  }

  /**
   * Stop remote control polling
   */
  private stopRemoteControlPolling(): void {
    if (this.remoteControlIntervalId) {
      clearInterval(this.remoteControlIntervalId);
      this.remoteControlIntervalId = null;
      logger.info('Remote control polling stopped');
    }
  }

  /**
   * Check remote control state and sync local pause state
   */
  private async checkRemoteControlState(): Promise<void> {
    try {
      const shouldBeRunning = await stateManager.checkRemoteControlState();

      // Sync local state with remote state
      if (shouldBeRunning && this.isPaused) {
        // Remote says run, but we're paused - resume
        logger.info('Remote control: resuming from admin command');
        this.resume();
      } else if (!shouldBeRunning && !this.isPaused) {
        // Remote says pause, but we're running - pause
        logger.info('Remote control: pausing from admin command');
        this.pause();
      }
    } catch (error: any) {
      // Don't crash if remote check fails, just log and continue
      logger.warn(`Remote control check failed: ${error.message}`);
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
