/**
 * Scenario registry
 */

export * from './base.js';
export * from './bootstrap.js';
export * from './lp-flow.js';
export * from './bnpl-cycle.js';

import { BaseScenario, type ScenarioType } from './base.js';
import { BootstrapScenario } from './bootstrap.js';
import { LpDepositScenario, LpWithdrawScenario } from './lp-flow.js';
import { CreateBillScenario, FullBnplCycleScenario } from './bnpl-cycle.js';

export const scenarios: Record<string, () => BaseScenario> = {
  bootstrap: () => new BootstrapScenario(),
  'lp-deposit': () => new LpDepositScenario(),
  'lp-withdraw': () => new LpWithdrawScenario(),
  'bnpl-create-bill': () => new CreateBillScenario(),
  'bnpl-cycle': () => new FullBnplCycleScenario(),
};

export function createScenario(type: string): BaseScenario {
  const factory = scenarios[type];
  if (!factory) {
    throw new Error(`Unknown scenario type: ${type}`);
  }
  return factory();
}
