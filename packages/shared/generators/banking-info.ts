/**
 * Banking info test data generator
 */

import { BANK_NAMES, SWIFT_CODES, COMPANY_NAMES, COMPANY_SUFFIXES } from './names.js';
import { pick, pickIndex, randomDigits } from './random.js';
import type { BankingInfo } from './types.js';

export function generateBankingInfo(): BankingInfo {
  const bankIndex = pickIndex(BANK_NAMES);
  const bankName = BANK_NAMES[bankIndex];
  const swiftCode = SWIFT_CODES[bankIndex];
  const companyName = `${pick(COMPANY_NAMES)} ${pick(COMPANY_SUFFIXES)}`;

  return {
    accountName: companyName,
    accountNumber: randomDigits(12),
    routingNumber: randomDigits(9),
    bankName: bankName,
    swiftCode: swiftCode,
  };
}
