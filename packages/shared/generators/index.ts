/**
 * Test data generators for Lumen Later
 * Shared between frontend and testnet bot
 */

// Types
export * from './types.js';

// Name dictionaries
export * from './names.js';

// Random utilities
export * from './random.js';

// Generators
export { generateBusinessInfo } from './business-info.js';
export { generateContactPerson, generateContactInfo } from './contact-info.js';
export { generateBankingInfo } from './banking-info.js';
export { generateDocumentInfo, generateKYBDocuments } from './documents.js';
export { generateBillData, generateOrderId, type BillDataOptions } from './bill-data.js';

// Full merchant application generator
import { generateBusinessInfo } from './business-info.js';
import { generateContactInfo } from './contact-info.js';
import { generateBankingInfo } from './banking-info.js';
import { generateKYBDocuments } from './documents.js';
import type { MerchantApplicationData } from './types.js';

export function generateMerchantApplication(): MerchantApplicationData {
  return {
    businessInfo: generateBusinessInfo(),
    contactInfo: generateContactInfo(),
    bankingInfo: generateBankingInfo(),
    documents: generateKYBDocuments(),
  };
}
