'use client';

import { useWallet } from '@/hooks/web3/use-wallet';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { MerchantAuthCheck } from '@/components/merchant/merchant-auth-check';

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConnected } = useWallet();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);
  
  // Check if we're on pages that don't require merchant auth
  const isPublicMerchantPage = pathname.includes('/merchant/enroll') || 
                              pathname.includes('/merchant/application-status');
  
  // Don't require merchant auth for enrollment-related pages
  const requireMerchantAuth = !isPublicMerchantPage;
  
  return (
    <MerchantAuthCheck requireMerchant={requireMerchantAuth}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </MerchantAuthCheck>
  );
}