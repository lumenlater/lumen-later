/**
 * Bill data test generator
 */

import { randomInt, randomHex } from './random.js';
import type { BillData } from './types.js';

const PRODUCT_CATEGORIES = [
  'Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books',
  'Beauty', 'Toys', 'Automotive', 'Health', 'Food'
];

const PRODUCT_ADJECTIVES = [
  'Premium', 'Deluxe', 'Professional', 'Essential', 'Classic',
  'Modern', 'Vintage', 'Compact', 'Ultra', 'Pro'
];

export interface BillDataOptions {
  minAmount?: number;  // in cents (USDC has 7 decimals, but we use cents for readability)
  maxAmount?: number;
  merchantName?: string;
}

export function generateBillData(options: BillDataOptions = {}): BillData {
  const {
    minAmount = 1000,      // $10.00
    maxAmount = 50000,     // $500.00
    merchantName = 'Test Store',
  } = options;

  const amountCents = randomInt(minAmount, maxAmount);
  // Convert to USDC (7 decimals): cents * 10^5
  const amount = BigInt(amountCents) * BigInt(100000);

  const category = PRODUCT_CATEGORIES[randomInt(0, PRODUCT_CATEGORIES.length - 1)];
  const adjective = PRODUCT_ADJECTIVES[randomInt(0, PRODUCT_ADJECTIVES.length - 1)];

  return {
    amount,
    orderId: `ORD-${randomHex(8).toUpperCase()}`,
    description: `${adjective} ${category} Purchase at ${merchantName}`,
  };
}

export function generateOrderId(): string {
  return `ORD-${randomHex(8).toUpperCase()}`;
}
