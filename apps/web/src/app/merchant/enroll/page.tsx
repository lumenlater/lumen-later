'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BusinessInfoStep } from '@/components/merchant/enrollment/BusinessInfoStep';
import { DocumentsStepPOC as DocumentsStep } from '@/components/merchant/enrollment/DocumentsStepPOC';
import { ContactInfoStep } from '@/components/merchant/enrollment/ContactInfoStep';
import { BankingInfoStep } from '@/components/merchant/enrollment/BankingInfoStep';
import { ReviewStep } from '@/components/merchant/enrollment/ReviewStep';
import { 
  useMerchant,
} from '@/hooks/use-merchant';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  Check, 
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { BankingInfo, BusinessInfo, ContactInfo, KYBDocuments } from '@/types/merchant';
import { UnifiedMerchantStatus } from '@/types/merchant';

const steps = [
  { id: 1, name: 'Business Info', icon: Building2 },
  { id: 2, name: 'Contact Info', icon: Users },
  { id: 3, name: 'Documents', icon: FileText },
  { id: 4, name: 'Banking', icon: CreditCard },
  { id: 5, name: 'Review', icon: Check },
];

export default function MerchantEnrollmentPage() {
  const router = useRouter();
  const { isConnected, publicKey } = useWallet();
  const { 
    isLoading, 
    submitMerchantEnrollment, 
    merchantStatus,
    isSubmitting,
    currentApplication 
  } = useMerchant(publicKey || '');

  const [currentStep, setCurrentStep] = useState(1);
  const [applicationData, setApplicationData] = useState<{
    businessInfo?: BusinessInfo;
    contactInfo?: ContactInfo;
    documents?: KYBDocuments;
    bankingInfo?: BankingInfo;
  }>({});
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);

  // Check if user was redirected here
  useEffect(() => {
    // Check if user came from another merchant page
    const referrer = document.referrer;
    if (referrer && referrer.includes('/merchant/') && !referrer.includes('/merchant/enroll')) {
      setShowRedirectMessage(true);
    }
  }, []);

  useEffect(() => {
    // Redirect based on status - check currentApplication for submitted status
    // Check for pending/submitted first to prevent approved override
    if (currentApplication && !isSubmitting) {
      // If there's an application in DB, redirect to status page
      router.push('/merchant/application-status');
      return;
    }
    
    if (merchantStatus === UnifiedMerchantStatus.Pending || merchantStatus === UnifiedMerchantStatus.Submitted) {
      router.push('/merchant/application-status');
      return;
    }
    
    if (merchantStatus === UnifiedMerchantStatus.Approved) {
      router.push('/merchant/dashboard');
      return;
    }
  }, [merchantStatus, currentApplication, isSubmitting, router]); 

  // Don't show loading state for too long
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    // Hide loading after 3 seconds regardless of actual loading state
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  
  // Show loading state only during initial load and for max 3 seconds
  if (showLoading && isLoading && !applicationData.businessInfo && !currentApplication) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>
              Checking your merchant enrollment status...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to start the merchant enrollment process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleBusinessInfoNext = (data: BusinessInfo) => {
    setApplicationData(prev => ({ ...prev, businessInfo: data }));
    setCurrentStep(2);
  };

  const handleContactInfoNext = (data: ContactInfo) => {
    setApplicationData(prev => ({ ...prev, contactInfo: data }));
    setCurrentStep(3);
  };

  const handleDocumentsNext = (data: KYBDocuments) => {
    setApplicationData(prev => ({ ...prev, documents: data }));
    setCurrentStep(4);
  };

  const handleBankingNext = (data: BankingInfo) => {
    setApplicationData(prev => ({ ...prev, bankingInfo: data }));
    setCurrentStep(5);
  };

  const handleSubmit = async () => {
    if (!applicationData.businessInfo || !applicationData.contactInfo || 
        !applicationData.documents || !applicationData.bankingInfo) {
      return;
    }

    try {
      const applicationId = await submitMerchantEnrollment(
        applicationData.businessInfo,
        applicationData.contactInfo,
        applicationData.documents,
        applicationData.bankingInfo
      );
      
      // Redirect to success page
      router.push(`/merchant/application-success?id=${applicationId}`);
    } catch (error) {
      console.error('Failed to submit application:', error);
    }
  };

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="space-y-8">
      <div className="max-w-4xl mx-auto">
        {/* Redirect Message */}
        {showRedirectMessage && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-blue-800 font-medium">Merchant Access Required</p>
                <p className="text-blue-700 text-sm mt-1">
                  You need to complete the merchant enrollment process to access merchant features. 
                  Please fill out the application below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Merchant Enrollment</h1>
          <p className="text-gray-600 mt-2">
            Complete your merchant application to start accepting Lumen Later payments
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    status === 'completed'
                      ? 'bg-green-500 border-green-500 text-white'
                      : status === 'current'
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}
                >
                  {status === 'completed' ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <StepIcon className="w-6 h-6" />
                  )}
                </div>
                <span
                  className={`text-sm mt-2 ${
                    status === 'current'
                      ? 'text-blue-600 font-medium'
                      : status === 'completed'
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                >
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`hidden md:block w-20 h-0.5 absolute ${
                      status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    style={{ marginLeft: '6rem' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card>
          {currentStep === 1 && (
            <CardContent className="p-6">
              <BusinessInfoStep
                initialData={applicationData.businessInfo}
                onNext={handleBusinessInfoNext}
              />
            </CardContent>
          )}

          {currentStep === 2 && (
            <CardContent className="p-6">
              <ContactInfoStep
                initialData={applicationData.contactInfo}
                onNext={handleContactInfoNext}
                onBack={() => setCurrentStep(1)}
              />
            </CardContent>
          )}

          {currentStep === 3 && (
            <CardContent className="p-6">
              <DocumentsStep
                initialData={applicationData.documents}
                onNext={handleDocumentsNext}
                onBack={() => setCurrentStep(2)}
              />
            </CardContent>
          )}

          {currentStep === 4 && (
            <CardContent className="p-6">
              <BankingInfoStep
                initialData={applicationData.bankingInfo}
                onNext={handleBankingNext}
                onBack={() => setCurrentStep(3)}
              />
            </CardContent>
          )}

          {currentStep === 5 && (
            <CardContent className="p-6">
              <ReviewStep
                applicationData={applicationData}
                onSubmit={handleSubmit}
                onBack={() => setCurrentStep(4)}
                onEdit={(step) => setCurrentStep(step)}
                isLoading={isLoading}
              />
            </CardContent>
          )}
        </Card>

        {/* Help Section */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact our merchant support team at{' '}
              <Button variant="link" className="p-0 h-auto">
                merchants@lumenlater.com
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

