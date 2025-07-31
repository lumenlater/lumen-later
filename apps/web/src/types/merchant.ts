/**
 * Simplified merchant contract interface
 * Only stores MongoDB ObjectID on blockchain
 */

export interface MerchantData {
  // MongoDB application ID reference
  application_id: string;
  
  // Status on blockchain
  status: UnifiedMerchantStatus;

}
  // Merchant types and enums

export enum BusinessCategory {
  RETAIL = 'retail',
  ECOMMERCE = 'e-commerce',
  SERVICES = 'services',
  FOOD_BEVERAGE = 'food_beverage',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  TECHNOLOGY = 'technology',
  OTHER = 'other'
}

export enum DocumentType {
  BUSINESS_LICENSE = 'business_license',
  TAX_ID = 'tax_id',
  BANK_STATEMENT = 'bank_statement',
  UTILITY_BILL = 'utility_bill'
}

export enum DocumentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// Types
export interface BusinessInfo {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  taxId: string;
  category: BusinessCategory;
  subcategory: string;
  yearEstablished: number;
  monthlyVolume: number;
  website: string;
  description: string;
  businessAddress: AddressInfo;
}

export interface ContactInfo {
  primaryContact: ContactPerson;
  technicalContact?: ContactPerson;
  financialContact?: ContactPerson;
}

export interface ContactPerson {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
}

export interface AddressInfo {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface KYBDocuments {
  businessRegistration: DocumentInfo;
  taxCertificate: DocumentInfo;
  bankStatement: DocumentInfo;
  utilityBill: DocumentInfo;
  additionalDocs: DocumentInfo[];
}

export interface DocumentInfo {
  documentType: DocumentType;
  fileHash: string;
  uploadedAt: number;
  verified: boolean;
  verificationNotes: string;
}

export interface BankingInfo {
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  swiftCode?: string;
}


export interface MerchantApplication {
  id: string;
  applicantAddress: string;
  businessInfo: BusinessInfo;
  contactInfo: ContactInfo;
  bankingInfo: BankingInfo;
  documents: KYBDocuments;
  status: string; // Using string to match Prisma ApplicationStatus enum
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  riskScore: number | null;
  blockchainTxHash: string | null;
  createdAt: string;
  updatedAt: string;
}


export enum UnifiedMerchantStatus {
  None = 'None',         // Not enrolled
  Draft = 'Draft',       // Application draft
  Submitted = 'Submitted', // Application submitted
  Pending = 'Pending',   // Enrolled but not approved
  Approved = 'Approved', // Approved and active
  Rejected = 'Rejected', // Application rejected
  Suspended = 'Suspended', // Temporarily suspended
}
