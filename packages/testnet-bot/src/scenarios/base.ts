/**
 * Base scenario class
 */

import { logger } from '../utils/logger.js';

export type ScenarioType =
  | 'bootstrap'
  | 'lp-deposit'
  | 'lp-withdraw'
  | 'merchant-onboard'
  | 'merchant-approve'
  | 'bnpl-create-bill'
  | 'bnpl-pay'
  | 'bnpl-repay';

export interface ScenarioResult {
  success: boolean;
  type: ScenarioType;
  details?: Record<string, any>;
  error?: string;
  txHash?: string;
  volume?: number; // Transaction volume in USDC (if applicable)
}

export abstract class BaseScenario {
  abstract type: ScenarioType;

  abstract canRun(): Promise<boolean>;

  abstract execute(): Promise<ScenarioResult>;

  protected success(details?: Record<string, any>, volume?: number): ScenarioResult {
    return {
      success: true,
      type: this.type,
      details,
      volume,
    };
  }

  protected failure(error: string): ScenarioResult {
    logger.error(`Scenario ${this.type} failed: ${error}`);
    return {
      success: false,
      type: this.type,
      error,
    };
  }
}
