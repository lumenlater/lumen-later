/**
 * Account pool management
 */

import { stellarCli, type Account } from '../utils/stellar-cli.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface AccountState {
  address: string;
  name: string;
  type: 'admin' | 'merchant' | 'user' | 'liquidator';
  createdAt: Date;
  // Merchant specific
  mongoId?: string;
  merchantStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  billsCreated?: number;
  // User specific
  lpBalance?: bigint;
  usdcBalance?: bigint;
  activeBills?: number[];
}

export interface AccountPool {
  admin: AccountState;
  merchants: AccountState[];
  users: AccountState[];
  liquidators: AccountState[];
}

export class AccountPoolManager {
  private pool: AccountPool | null = null;

  async initialize(): Promise<AccountPool> {
    logger.header('Initializing Account Pool');

    // Check Stellar CLI
    if (!stellarCli.isInstalled()) {
      throw new Error('Stellar CLI is not installed');
    }

    // Ensure admin account exists
    const adminAccount = stellarCli.ensureAccount(
      config.admin.accountName,
      true,
      config.network.name
    );

    this.pool = {
      admin: {
        address: adminAccount.address,
        name: adminAccount.name,
        type: 'admin',
        createdAt: new Date(),
      },
      merchants: [],
      users: [],
      liquidators: [],
    };

    // Load existing bot accounts
    const existingAccounts = stellarCli.listAccounts();

    for (const name of existingAccounts) {
      if (name.startsWith('bot-merchant-')) {
        const address = stellarCli.getAddress(name);
        this.pool.merchants.push({
          address,
          name,
          type: 'merchant',
          createdAt: new Date(),
          merchantStatus: 'none',
          billsCreated: 0,
        });
      } else if (name.startsWith('bot-user-')) {
        const address = stellarCli.getAddress(name);
        this.pool.users.push({
          address,
          name,
          type: 'user',
          createdAt: new Date(),
          activeBills: [],
        });
      } else if (name.startsWith('bot-liquidator-')) {
        const address = stellarCli.getAddress(name);
        this.pool.liquidators.push({
          address,
          name,
          type: 'liquidator',
          createdAt: new Date(),
        });
      }
    }

    logger.info(`Loaded ${this.pool.merchants.length} merchants, ${this.pool.users.length} users`);

    return this.pool;
  }

  getPool(): AccountPool {
    if (!this.pool) {
      throw new Error('Account pool not initialized');
    }
    return this.pool;
  }

  /**
   * Ensure we have at least N merchants
   */
  async ensureMerchants(count: number): Promise<AccountState[]> {
    if (!this.pool) throw new Error('Pool not initialized');

    const needed = count - this.pool.merchants.length;
    if (needed <= 0) return this.pool.merchants;

    logger.info(`Creating ${needed} new merchant accounts...`);

    for (let i = 0; i < needed; i++) {
      const num = this.pool.merchants.length + 1;
      const name = `bot-merchant-${String(num).padStart(3, '0')}`;
      const account = stellarCli.ensureAccount(name, true, config.network.name);

      this.pool.merchants.push({
        address: account.address,
        name,
        type: 'merchant',
        createdAt: new Date(),
        merchantStatus: 'none',
        billsCreated: 0,
      });
    }

    return this.pool.merchants;
  }

  /**
   * Ensure we have at least N users
   */
  async ensureUsers(count: number): Promise<AccountState[]> {
    if (!this.pool) throw new Error('Pool not initialized');

    const needed = count - this.pool.users.length;
    if (needed <= 0) return this.pool.users;

    logger.info(`Creating ${needed} new user accounts...`);

    for (let i = 0; i < needed; i++) {
      const num = this.pool.users.length + 1;
      const name = `bot-user-${String(num).padStart(3, '0')}`;
      const account = stellarCli.ensureAccount(name, true, config.network.name);

      this.pool.users.push({
        address: account.address,
        name,
        type: 'user',
        createdAt: new Date(),
        activeBills: [],
      });
    }

    return this.pool.users;
  }

  /**
   * Get a random merchant by status
   */
  getRandomMerchant(status?: 'none' | 'pending' | 'approved'): AccountState | null {
    if (!this.pool) return null;

    const filtered = status
      ? this.pool.merchants.filter((m) => m.merchantStatus === status)
      : this.pool.merchants;

    if (filtered.length === 0) return null;

    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  /**
   * Get a random user
   */
  getRandomUser(): AccountState | null {
    if (!this.pool || this.pool.users.length === 0) return null;
    return this.pool.users[Math.floor(Math.random() * this.pool.users.length)];
  }

  /**
   * Update merchant state
   */
  updateMerchant(address: string, updates: Partial<AccountState>): void {
    if (!this.pool) return;

    const merchant = this.pool.merchants.find((m) => m.address === address);
    if (merchant) {
      Object.assign(merchant, updates);
    }
  }

  /**
   * Update user state
   */
  updateUser(address: string, updates: Partial<AccountState>): void {
    if (!this.pool) return;

    const user = this.pool.users.find((u) => u.address === address);
    if (user) {
      Object.assign(user, updates);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    if (!this.pool) return null;

    return {
      totalMerchants: this.pool.merchants.length,
      approvedMerchants: this.pool.merchants.filter((m) => m.merchantStatus === 'approved').length,
      pendingMerchants: this.pool.merchants.filter((m) => m.merchantStatus === 'pending').length,
      totalUsers: this.pool.users.length,
      usersWithBorrows: this.pool.users.filter((u) => (u.activeBills?.length || 0) > 0).length,
    };
  }

  /**
   * Restore pool from saved state
   */
  restorePool(savedPool: AccountPool): void {
    this.pool = savedPool;
    logger.info(`Restored pool: ${savedPool.merchants.length} merchants, ${savedPool.users.length} users`);
  }
}

// Type aliases for exports
export type MerchantAccount = AccountState;
export type UserAccount = AccountState;

export const accountPool = new AccountPoolManager();
