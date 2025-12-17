/**
 * Stellar CLI wrapper for account management
 */

import { execSync } from 'child_process';
import { logger } from './logger.js';

export interface Account {
  name: string;
  address: string;
  secret?: string;
}

function exec(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error: any) {
    throw new Error(`Stellar CLI error: ${error.stderr || error.message}`);
  }
}

function execSilent(command: string): string | null {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

export const stellarCli = {
  /**
   * Check if Stellar CLI is installed
   */
  isInstalled(): boolean {
    return execSilent('stellar --version') !== null;
  },

  /**
   * Check if an account exists locally
   */
  accountExists(name: string): boolean {
    return execSilent(`stellar keys address ${name}`) !== null;
  },

  /**
   * Get account address
   */
  getAddress(name: string): string {
    return exec(`stellar keys address ${name}`);
  },

  /**
   * Get account secret key
   */
  getSecret(name: string): string {
    return exec(`stellar keys show ${name}`);
  },

  /**
   * Generate a new account
   */
  generateAccount(name: string, overwrite = false): Account {
    const cmd = overwrite
      ? `stellar keys generate ${name} --overwrite`
      : `stellar keys generate ${name}`;

    exec(cmd);

    const address = this.getAddress(name);
    logger.account('Created', `${name} (${address})`);

    return { name, address };
  },

  /**
   * Fund account on testnet
   */
  fundAccount(name: string, network = 'testnet'): void {
    logger.info(`Funding account ${name} on ${network}...`);
    exec(`stellar keys fund ${name} --network ${network}`);
    logger.success(`Account ${name} funded`);
  },

  /**
   * Get or create an account
   */
  ensureAccount(name: string, fund = true, network = 'testnet'): Account {
    if (this.accountExists(name)) {
      const address = this.getAddress(name);
      logger.account('Found existing', `${name} (${address})`);
      return { name, address };
    }

    const account = this.generateAccount(name);

    if (fund && network !== 'mainnet') {
      this.fundAccount(name, network);
    }

    return account;
  },

  /**
   * List all local accounts
   */
  listAccounts(): string[] {
    const output = execSilent('stellar keys ls');
    if (!output) return [];
    return output.split('\n').filter(Boolean);
  },

  /**
   * Generate multiple accounts with a prefix
   */
  ensureAccounts(
    prefix: string,
    count: number,
    fund = true,
    network = 'testnet'
  ): Account[] {
    const accounts: Account[] = [];

    for (let i = 1; i <= count; i++) {
      const name = `${prefix}-${String(i).padStart(3, '0')}`;
      const account = this.ensureAccount(name, fund, network);
      accounts.push(account);
    }

    return accounts;
  },
};
