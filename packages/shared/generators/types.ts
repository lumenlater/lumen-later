/**
 * Shared types for test data generation
 */

export interface AddressInfo {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BusinessInfo {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  taxId: string;
  category: string;
  subcategory: string;
  yearEstablished: number;
  monthlyVolume: number;
  website: string;
  description: string;
  businessAddress: AddressInfo;
}

export interface ContactPerson {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
}

export interface ContactInfo {
  primaryContact: ContactPerson;
  technicalContact?: ContactPerson;
  financialContact?: ContactPerson;
}

export interface BankingInfo {
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  swiftCode?: string;
}

export interface DocumentInfo {
  documentType: string;
  fileHash: string;
  uploadedAt: Date;
  verified: boolean;
  verificationNotes: string;
}

export interface KYBDocuments {
  businessRegistration: DocumentInfo;
  taxCertificate: DocumentInfo;
  bankStatement: DocumentInfo;
  utilityBill: DocumentInfo;
  additionalDocs: DocumentInfo[];
}

export interface MerchantApplicationData {
  businessInfo: BusinessInfo;
  contactInfo: ContactInfo;
  bankingInfo: BankingInfo;
  documents: KYBDocuments;
}

export interface BillData {
  amount: bigint;
  orderId: string;
  description: string;
}
