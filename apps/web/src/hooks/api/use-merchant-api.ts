/**
 * Unified Merchant API hook for all merchant-related API operations
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import CONTRACT_IDS from '@/config/contracts';
import { BusinessInfo, ContactInfo, KYBDocuments, BankingInfo, MerchantApplication } from '@/types/merchant';


export function useMerchantAPI() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Create merchant application in MongoDB
  const createApplication = useCallback(async (
    applicantAddress: string,
    businessInfo: BusinessInfo,
    contactInfo: ContactInfo,
    documents: KYBDocuments,
    bankingInfo: BankingInfo
  ): Promise<string> => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/merchant/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantAddress,
          businessInfo,
          contactInfo,
          documents,
          bankingInfo,
          contractId: CONTRACT_IDS.BNPL_CORE,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create application');
      }

      // API returns mongoId which is the application ID
      return data.mongoId || data.application?.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create application';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  // Get merchant application
  const getApplication = useCallback(async (applicantAddress: string): Promise<MerchantApplication | null> => {
    // Don't set loading for get operations to avoid blocking the UI
    try {
      const url = `/api/merchant/applications?applicantAddress=${applicantAddress}&contractId=${CONTRACT_IDS.BNPL_CORE}`;
      
      const response = await fetch(url);
      
      if (response.status === 404) {
        return null;
      }
      
      const data = await response.json();
      
      // The API returns the application directly, not wrapped in { success, application }
      if (data && data.id) {
        return data as MerchantApplication;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch application:', error);
      return null;
    }
  }, []);



  // Get merchant application
  const getApplications = useCallback(async (): Promise<MerchantApplication[]> => {
    // Don't set loading for get operations to avoid blocking the UI
    try {
      const url = `/api/merchant/applications?contractId=${CONTRACT_IDS.BNPL_CORE}`;
      
      const response = await fetch(url);
      
      if (response.status === 404) {
        return [];
      }
      
      const data = await response.json();
      
      // The API returns the application directly, not wrapped in { success, application }
      if (data && data.length > 0) {
        return data as MerchantApplication[];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch application:', error);
      return [];
    }
  }, []);

  // Update blockchain status
  const updateBlockchainStatus = useCallback(async (
    applicationId: string,
    txHash: string,
    isCommitted: boolean
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/merchant/applications/${applicationId}/blockchain-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash,
          isCommitted,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to update blockchain status:', data.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to update blockchain status:', error);
      return false;
    }
  }, []);


  // Mock file upload - replace with actual implementation
  const uploadDocument = useCallback(async (file: File, documentType: string): Promise<string> => {
    // In production, upload to IPFS or cloud storage
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockHash = `QmHash${Date.now()}${Math.random().toString(36).substring(2, 11)}`;
        resolve(mockHash);
      }, 1000);
    });
  }, []);

  return {
    // State
    isLoading,
    
    // Merchant operations
    createApplication,
    getApplication,
    getApplications,
    updateBlockchainStatus,
    uploadDocument,
  };
}