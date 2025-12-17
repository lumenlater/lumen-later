'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

import { useMerchant, } from '@/hooks/use-merchant';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  FileText, 
  Mail,
  Calendar,
  User,
  ArrowRight,
  Link as LinkIcon,
  RefreshCw,
  Database
} from 'lucide-react';
import { UnifiedMerchantStatus } from '@/types/merchant';

export default function ApplicationStatusPage() {
  const router = useRouter();
  const { isConnected, publicKey } = useWallet();
  const { 
    merchantStatus,
    getApplication, 
    completeBlockchainEnrollment, 
    loadCurrentStatus,
    currentApplication,
    isLoading: hookLoading 
  } = useMerchant(publicKey || '');
  
  const [loading, setLoading] = useState(true);
  const [checkingBlockchain, setCheckingBlockchain] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (isConnected && publicKey) {
        setLoading(true);
        await loadCurrentStatus();
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, publicKey]); // Remove loadCurrentStatus from deps to prevent infinite loop

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view your application status.
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

  // Use hook loading state instead of local loading state
  if (hookLoading && !currentApplication) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application status...</p>
        </div>
      </div>
    );
  }

  if (!currentApplication) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Application Found</CardTitle>
            <CardDescription>
              You haven't submitted a merchant application yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push('/merchant/enroll')} className="w-full">
              Start Application
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="w-full"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusConfig = (status: UnifiedMerchantStatus) => {
    switch (status) {
      case UnifiedMerchantStatus.Draft:
        return { 
          icon: FileText, 
          color: 'bg-gray-100 text-gray-800', 
          title: 'Draft',
          description: 'Complete your application to submit for review'
        };
      case UnifiedMerchantStatus.Submitted:
        return { 
          icon: Clock, 
          color: 'bg-blue-100 text-blue-800', 
          title: 'Submitted',
          description: 'Your application has been submitted and is queued for review'
        };
      case UnifiedMerchantStatus.Pending:
        return { 
          icon: AlertCircle, 
          color: 'bg-yellow-100 text-yellow-800', 
          title: 'Under Review',
          description: 'Our team is currently reviewing your application'
        };
      case UnifiedMerchantStatus.Suspended:
        return { 
          icon: FileText, 
          color: 'bg-orange-100 text-orange-800', 
          title: 'Documents Needed',
          description: 'Additional documentation is required'
        };
      case UnifiedMerchantStatus.Approved:
        return { 
          icon: CheckCircle, 
          color: 'bg-green-100 text-green-800', 
          title: 'Approved',
          description: 'Congratulations! Your merchant account has been approved'
        };
      case UnifiedMerchantStatus.Rejected:
        return { 
          icon: XCircle, 
          color: 'bg-red-100 text-red-800', 
          title: 'Rejected',
          description: 'Your application has been rejected'
        };
      // Note: Suspended status is not part of ApplicationStatus enum
      // This case is commented out to prevent runtime errors
      // case ApplicationStatus.Suspended:
      //   return { 
      //     icon: XCircle, 
      //     color: 'bg-red-100 text-red-800', 
      //     title: 'Suspended',
      //     description: 'Your merchant account has been suspended'
      //   };
      default:
        return { 
          icon: Clock, 
          color: 'bg-gray-100 text-gray-800', 
          title: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const getProgressPercentage = (status: UnifiedMerchantStatus): number => {
    switch (status) {
      case UnifiedMerchantStatus.Draft: return 10;
      case UnifiedMerchantStatus.Submitted: return 25;
      case UnifiedMerchantStatus.Pending: return 50;
      case UnifiedMerchantStatus.Suspended: return 40;
      case UnifiedMerchantStatus.Approved: return 100;
      case UnifiedMerchantStatus.Rejected: return 100;
      // case ApplicationStatus.Suspended: return 100;
      default: return 0;
    }
  };

  const statusConfig = getStatusConfig(merchantStatus as UnifiedMerchantStatus);
  const StatusIcon = statusConfig.icon;
  const progressPercentage = getProgressPercentage(merchantStatus as UnifiedMerchantStatus);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Application Status</h1>
          <p className="text-gray-600 mt-2">
            Track the progress of your merchant application
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <StatusIcon className="w-6 h-6" />
                  Application #{currentApplication.id}
                </CardTitle>
                <CardDescription>
                  Submitted on {new Date(currentApplication.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge className={statusConfig.color}>
                {statusConfig.title}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Application Progress
                </span>
                <span className="text-sm text-gray-500">
                  {progressPercentage}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Status Description */}
            <Alert>
              <StatusIcon className="h-4 w-4" />
              <AlertDescription>
                {statusConfig.description}
                {currentApplication.reviewNotes && merchantStatus === UnifiedMerchantStatus.Rejected && (
                  <div className="mt-2 font-medium">
                    Reason: {currentApplication.reviewNotes}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Blockchain Status */}
            <div className={`p-4 rounded-lg ${merchantStatus === UnifiedMerchantStatus.Submitted ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Blockchain Status
                  {checkingBlockchain && (
                    <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />
                  )}
                </h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      setCheckingBlockchain(true);
                      await loadCurrentStatus();
                      setCheckingBlockchain(false);
                    }}
                    disabled={checkingBlockchain}
                  >
                    <RefreshCw className={`w-3 h-3 ${checkingBlockchain ? 'animate-spin' : ''}`} />
                  </Button>
                  {merchantStatus === UnifiedMerchantStatus.Submitted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const success = await completeBlockchainEnrollment();
                        if (success) {
                          // Refresh application data
                          await loadCurrentStatus();
                        }
                      }}
                      disabled={hookLoading}
                    >
                      {hookLoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        'Retry Commit'
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Status:</span>
                  <Badge variant={merchantStatus === UnifiedMerchantStatus.Submitted ? 'default' : 'destructive'}>
                    {merchantStatus === UnifiedMerchantStatus.Submitted ? 'Committed to DB' : 'Pending Blockchain Commit'}
                  </Badge>
                  {merchantStatus && (
                    <span className="text-xs text-gray-500">
                      (Live check: {merchantStatus ? 'Found on chain' : 'Not found'})
                    </span>
                  )}
                  {currentApplication && merchantStatus && (
                    <span className="text-xs text-gray-500 ml-2">
                      [DB ID: {currentApplication.id.slice(0, 8)}... Status: {merchantStatus as UnifiedMerchantStatus}]
                    </span>
                  )}
                </div>
                {currentApplication.blockchainTxHash && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" />
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${currentApplication.blockchainTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View Transaction: {currentApplication.blockchainTxHash.slice(0, 8)}...
                    </a>
                  </div>
                )}
                <div className="text-xs text-gray-600">
                  {/* TODO: Add blockchain commit attempts tracking if needed */}
                </div>
              </div>
            </div>

            {/* Risk Score */}
            {currentApplication.riskScore && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Risk Assessment</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Risk Score:</span>
                  <Badge variant={currentApplication.riskScore > 70 ? 'destructive' : currentApplication.riskScore > 40 ? 'default' : 'secondary'}>
                    {currentApplication.riskScore}/100
                  </Badge>
                </div>
              </div>
            )}
            
            {/* Blockchain Application Details */}
            {currentApplication && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Blockchain Application Record
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge variant="secondary">{merchantStatus as UnifiedMerchantStatus}</Badge>
                  </div>
                  {currentApplication.businessInfo && (
                    <div>
                      <span className="font-medium">Business Name:</span> {currentApplication.businessInfo.legalName}
                    </div>
                  )}
                  {currentApplication.contactInfo && (
                    <div>
                      <span className="font-medium">Contact Email:</span> {currentApplication.contactInfo.primaryContact.email}
                    </div>
                  )}
                  {currentApplication.createdAt && (
                    <div>
                      <span className="font-medium">Submitted:</span> {new Date(currentApplication.createdAt).toLocaleString()}
                    </div>
                  )}
                  {currentApplication.reviewedAt && (
                    <div>
                      <span className="font-medium">Reviewed:</span> {new Date(currentApplication.reviewedAt).toLocaleString()}
                    </div>
                  )}
                  {currentApplication.reviewedBy && (
                    <div>
                      <span className="font-medium">Reviewer:</span> {currentApplication.reviewedBy.slice(0, 8)}...
                    </div>
                  )}
                  {currentApplication.reviewNotes && (
                    <div className="mt-2">
                      <span className="font-medium">Review Notes:</span>
                      <p className="mt-1 text-gray-600">{currentApplication.reviewNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Legal Name</span>
                <p className="text-sm">{currentApplication.businessInfo?.legalName || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Trading Name</span>
                <p className="text-sm">{currentApplication.businessInfo?.tradingName || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Category</span>
                <p className="text-sm capitalize">
                  {currentApplication.businessInfo?.category?.replace('_', ' ') || 'Not provided'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Website</span>
                <p className="text-sm">
                  {currentApplication.businessInfo?.website ? (
                    <a 
                      href={currentApplication.businessInfo.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {currentApplication.businessInfo.website}
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Review Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-500">Submitted</span>
                  <p className="text-sm">
                    {new Date(currentApplication.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {currentApplication.reviewedAt && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Reviewed</span>
                    <p className="text-sm">
                      {currentApplication.reviewedAt 
                        ? new Date(currentApplication.reviewedAt).toLocaleDateString()
                        : 'Not yet reviewed'
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-500">Contact</span>
                  <p className="text-sm">{currentApplication.contactInfo?.primaryContact?.email || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">

          
          {merchantStatus === UnifiedMerchantStatus.Approved && (
            <Button 
              onClick={() => router.push('/merchant')}
              className="flex items-center gap-2"
            >
              Access Merchant Portal
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </div>

        {/* Timeline */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Application Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Application Submitted</p>
                  <p className="text-sm text-gray-500">
                    {new Date(currentApplication.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {currentApplication.reviewedAt && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <StatusIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{statusConfig.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(currentApplication.reviewedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}