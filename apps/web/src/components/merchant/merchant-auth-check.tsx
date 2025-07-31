'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/web3/use-wallet';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Store } from 'lucide-react';
import { useBnplMerchant } from '@/hooks/web3/use-bnpl-merchant';

interface MerchantAuthCheckProps {
  children: React.ReactNode;
  requireMerchant?: boolean;
}

export function MerchantAuthCheck({ children, requireMerchant = true }: MerchantAuthCheckProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected, publicKey } = useWallet();
  const { merchantData, isApprovedMerchant } = useBnplMerchant(publicKey || '');
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    if (publicKey && !hasChecked) {
      checkMerchantAuthStatus();
    }
  }, [isConnected, publicKey, hasChecked]);

  const checkMerchantAuthStatus = async () => {
    setIsChecking(true);
    try {
      // Check if the user is an authorized merchant
      const isMerchant = isApprovedMerchant;
      setHasChecked(true);

      // If user is not a merchant and we're not on the enroll or register pages
      if (!isMerchant && requireMerchant && 
          !pathname.includes('/merchant/enroll') && 
          !pathname.includes('/merchant/register') &&
          !pathname.includes('/merchant/application-status')) {
        // Redirect to enrollment page
        router.push('/merchant/enroll');
      }
    } catch (error) {
      console.error('Failed to check merchant status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-gray-600">Checking merchant status...</p>
        </div>
      </div>
    );
  }

  // If not connected, show connect wallet message
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to access the merchant portal.
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

  // If require merchant but user is not a merchant (and not on enrollment pages)
  if (requireMerchant && !isApprovedMerchant && hasChecked &&
      !pathname.includes('/merchant/enroll') && 
      !pathname.includes('/merchant/register') &&
      !pathname.includes('/merchant/application-status')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle>Merchant Access Required</CardTitle>
                <CardDescription>
                  You need to be an authorized merchant to access this page.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Not a merchant yet?</h4>
              <p className="text-sm text-gray-600 mb-3">
                Join our merchant network to start accepting Lumen Later payments and grow your business.
              </p>
              <Button 
                onClick={() => router.push('/merchant/enroll')}
                className="w-full"
              >
                <Store className="mr-2 h-4 w-4" />
                Start Merchant Enrollment
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Already enrolled?</p>
              <Button 
                variant="outline"
                onClick={() => router.push('/merchant/application-status')}
                className="w-full"
              >
                Check Application Status
              </Button>
            </div>

            <div className="pt-4 border-t">
              <Button 
                variant="ghost"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}