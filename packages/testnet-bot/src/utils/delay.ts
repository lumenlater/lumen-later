/**
 * Delay and throttling utilities
 */

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return delay(ms);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Rate limiter class for API calls
 */
export class RateLimiter {
  private lastCall: number = 0;
  private minInterval: number;

  constructor(minInterval: number = 1000) {
    this.minInterval = minInterval;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;

    if (elapsed < this.minInterval) {
      await delay(this.minInterval - elapsed);
    }

    this.lastCall = Date.now();
  }
}
