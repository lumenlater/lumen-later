import { getMerchantApplicationService } from '@/services/merchant-application.service';
import type { MerchantApplication } from '@/types/merchant';

/**
 * Migrate merchant application data from localStorage to MongoDB
 * This is a one-time migration utility for POC data
 */
export async function migrateMerchantDataToDatabase(contractId: string): Promise<void> {
  const merchantService = getMerchantApplicationService();
  
  // Get all localStorage keys
  const keys = Object.keys(localStorage);
  const applicationKeys = keys.filter(key => key.startsWith('merchant_application_'));
  
  console.log(`Found ${applicationKeys.length} merchant applications to migrate`);
  
  for (const key of applicationKeys) {
    try {
      const applicantAddress = key.replace('merchant_application_', '');
      const storedData = localStorage.getItem(key);
      
      if (!storedData) continue;
      
      const application: MerchantApplication = JSON.parse(storedData);
      
      // Check if already migrated
      const existingApp = await merchantService.getApplicationByApplicant(
        applicantAddress,
        contractId
      );
      
      if (existingApp) {
        console.log(`Application for ${applicantAddress} already migrated, skipping...`);
        continue;
      }
      
      // Create application in database
      console.log(`Migrating application for ${applicantAddress}...`);
      const { mongoId } = await merchantService.createApplication(
        applicantAddress,
        contractId,
        application.businessInfo,
        application.contactInfo,
        application.documents,
        application.bankingInfo
      );
      
      // If the application was already committed to blockchain, update the reference
      if (application.isBlockchainCommitted && application.blockchainTxHash) {
        await merchantService.updateBlockchainReference(
          mongoId,
          application.blockchainTxHash
        );
        await merchantService.createBlockchainReference(
          mongoId,
          contractId,
          application.blockchainTxHash
        );
      }
      
      console.log(`Successfully migrated application ${mongoId}`);
      
      // Optionally remove from localStorage after successful migration
      // localStorage.removeItem(key);
      // localStorage.removeItem(`merchant_status_${applicantAddress}`);
    } catch (error) {
      console.error(`Failed to migrate application from key ${key}:`, error);
    }
  }
  
  console.log('Migration completed');
}

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  const keys = Object.keys(localStorage);
  return keys.some(key => key.startsWith('merchant_application_'));
}

/**
 * Get migration status
 */
export function getMigrationStatus(): {
  totalApplications: number;
  applicantAddresses: string[];
} {
  const keys = Object.keys(localStorage);
  const applicationKeys = keys.filter(key => key.startsWith('merchant_application_'));
  const applicantAddresses = applicationKeys.map(key => 
    key.replace('merchant_application_', '')
  );
  
  return {
    totalApplications: applicationKeys.length,
    applicantAddresses,
  };
}