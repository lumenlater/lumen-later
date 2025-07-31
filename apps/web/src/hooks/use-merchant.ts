/**
 * Integrated Merchant hook combining API and blockchain operations
 * Replaces both use-merchant.ts and use-merchant-enrollment.ts
 */

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from './web3/use-wallet';
import { useBnplMerchant } from './web3/use-bnpl-merchant';
import { useMerchantAPI } from './api/use-merchant-api';
import { useToast } from '@/components/ui/use-toast';
import { UnifiedMerchantStatus, MerchantApplication, BusinessInfo, ContactInfo, KYBDocuments, BankingInfo } from '@/types/merchant';

// Application State Management
// 1. Draft (localStorage only) - not submitted
// 2. Submitted (MongoDB only) - waiting for admin review
// 3. Pending/Approved/Rejected/Suspended (Contract) - admin decision

export function useMerchant( merchant_public_key: string ) {
  const { toast } = useToast();
  const merchantAPI = useMerchantAPI();
  const { merchantData: merchantDataFromChain, enrollMerchant: enrollMerchantOnChain, refetchMerchantStatus , isLoading :merchantBlockchainLoading, authorizeMerchant} = useBnplMerchant(merchant_public_key);
  
  const [currentApplication, setCurrentApplication] = useState<MerchantApplication | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [merchantStatus, setMerchantStatus] = useState<UnifiedMerchantStatus>(UnifiedMerchantStatus.None);
  const [draftData, setDraftData] = useState<any>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Save draft to localStorage
  const saveDraft = useCallback((data: any) => {
    if (!merchant_public_key) return;
    const draftKey = `merchant_draft_${merchant_public_key}`;
    localStorage.setItem(draftKey, JSON.stringify(data));
    setDraftData(data);
  }, [merchant_public_key]);
  
  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (!merchant_public_key) return;
    const draftKey = `merchant_draft_${merchant_public_key}`;
    localStorage.removeItem(draftKey);
    setDraftData(null);
  }, [merchant_public_key]);
  
  const loadCurrentStatus = useCallback(async () => {
    if (!merchant_public_key) return;
    
    setIsLoadingInitial(true);
    try {
      // 1. Check localStorage for draft
      const draftKey = `merchant_draft_${merchant_public_key}`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        setDraftData(JSON.parse(draft));
      }
      
      // 2. Check MongoDB for submitted application
      const application = await merchantAPI.getApplication(merchant_public_key);
      if (application) {
        setCurrentApplication(application);
      }
    } catch (error) {
      console.error('Failed to load merchant status:', error);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [merchant_public_key, merchantAPI]);

  // Load current status on mount
  useEffect(() => {
    if (merchant_public_key) {
      loadCurrentStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant_public_key]); // Remove loadCurrentStatus from deps to prevent infinite loop

  // Submit complete merchant enrollment (MongoDB + Blockchain)
  const submitMerchantEnrollment = useCallback(async (
    businessInfo: BusinessInfo,
    contactInfo: ContactInfo,
    documents: KYBDocuments,
    bankingInfo: BankingInfo
  ): Promise<string> => {
    if (!merchant_public_key) throw new Error('Wallet not connected');
    
    setIsSubmitting(true);
    
    try {
      // Step 1: Create application in MongoDB
      const applicationId = await merchantAPI.createApplication(
        merchant_public_key,
        businessInfo,
        contactInfo,
        documents,
        bankingInfo
      );

      toast({
        title: 'Application Submitted',
        description: 'Your application has been submitted for review.',
      });
      
      // Clear draft after successful submission
      clearDraft();

      // Step 2: Immediately enroll on blockchain with Pending status
      try {
        const txHash = await enrollMerchantOnChain(applicationId);
        

        toast({
          title: 'Blockchain Registration Complete',
          description: 'Your application is now registered on the blockchain.',
        });
      } catch (blockchainError) {
        console.error('Blockchain enrollment failed:', blockchainError);
        // Don't throw here - MongoDB submission was successful
        toast({
          title: 'Blockchain Registration Pending',
          description: 'Application submitted. Blockchain registration will be retried.',
          variant: 'default',
        });
      }
      
      // Reload status
      await loadCurrentStatus();

      return applicationId;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit enrollment';
      toast({
        title: 'Enrollment Failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [merchant_public_key, merchantAPI, enrollMerchantOnChain, toast, loadCurrentStatus, clearDraft]);

  // Complete blockchain enrollment (called for retry from status page)
  const completeBlockchainEnrollment = useCallback(async (): Promise<boolean> => {
    if (!merchant_public_key || !currentApplication) return false;
    
    // Check if already on blockchain

    if (merchantDataFromChain.status !== UnifiedMerchantStatus.None ) {
      toast({
        title: 'Already Enrolled',
        description: 'You are already registered on the blockchain.',
      });
      
      return true;
    }

    setIsSubmitting(true);
    
    try {
      // Enroll on blockchain using MongoDB ID
      const txHash = await enrollMerchantOnChain(currentApplication.id);
      
      toast({
        title: 'Blockchain Enrollment Complete',
        description: 'You are now registered on the blockchain!',
      });

      // Reload status
      await loadCurrentStatus();
      
      return true;
    } catch (error) {
      console.error('Blockchain enrollment failed:', error);
      
      toast({
        title: 'Blockchain Enrollment Failed',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [merchant_public_key, currentApplication, enrollMerchantOnChain, merchantAPI, toast, loadCurrentStatus]);

  // Check complete merchant status (DB + Blockchain)
  const checkMerchantStatus = refetchMerchantStatus;

  // Combined loading state - only for active operations, not initial load
  const isLoading = isLoadingInitial || isSubmitting;
  
  
  // Computed values
  const isApprovedMerchant = merchantDataFromChain.status === UnifiedMerchantStatus.Approved;
  const canAccessMerchantPortal = merchantDataFromChain.status !== UnifiedMerchantStatus.None;

  return {
    // State
    currentApplication,
    isLoading,
    isSubmitting,
    
    // Status
    merchantDataFromChain,
    merchantStatus: merchantDataFromChain.status || (currentApplication ? {status: UnifiedMerchantStatus.Submitted, id: currentApplication.id} : {status: UnifiedMerchantStatus.None, id: null}),
    isApprovedMerchant,
    canAccessMerchantPortal,
    loading: isLoading,
    error: null, // For legacy compatibility
    
    // Draft management
    draftData,
    saveDraft,
    clearDraft,
    
    // Database operations
    createApplication: merchantAPI.createApplication,
    getApplication: merchantAPI.getApplication,
    uploadDocument: merchantAPI.uploadDocument,
    
    
    // Integrated operations
    submitMerchantEnrollment,
    completeBlockchainEnrollment,
    checkMerchantStatus,
    loadCurrentStatus,
    authorizeMerchant: authorizeMerchant,
  };
}

// Helper to get merchant status description
export function getMerchantStatusDescription(status: UnifiedMerchantStatus): string {
  switch (status) {
    case UnifiedMerchantStatus.None:
      return 'Not enrolled';
    case UnifiedMerchantStatus.Pending:
      return 'Pending approval';
    case UnifiedMerchantStatus.Approved:
      return 'Approved';
    case UnifiedMerchantStatus.Rejected:
      return 'Rejected';
    case UnifiedMerchantStatus.Suspended:
      return 'Suspended';
    default:
      return 'Unknown';
  }
}