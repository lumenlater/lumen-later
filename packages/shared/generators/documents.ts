/**
 * KYB Documents test data generator
 */

import { randomHex } from './random.js';
import type { DocumentInfo, KYBDocuments } from './types.js';

const DOCUMENT_TYPES = [
  'business_license',
  'tax_id',
  'bank_statement',
  'utility_bill',
] as const;

export function generateDocumentInfo(documentType: string): DocumentInfo {
  return {
    documentType,
    fileHash: `0x${randomHex(64)}`,
    uploadedAt: new Date(),
    verified: false,
    verificationNotes: '',
  };
}

export function generateKYBDocuments(): KYBDocuments {
  return {
    businessRegistration: generateDocumentInfo('business_license'),
    taxCertificate: generateDocumentInfo('tax_id'),
    bankStatement: generateDocumentInfo('bank_statement'),
    utilityBill: generateDocumentInfo('utility_bill'),
    additionalDocs: [],
  };
}
