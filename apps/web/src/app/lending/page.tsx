'use client';

import { Header } from '@/components/layout/header';
import { LendingSection } from '@/components/lending/lending-section';
import { BackButton } from '@/components/ui/back-button';

export default function LendingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BackButton />
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Lending Pool
          </h1>
          <p className="text-gray-600">
            Deposit USDC to earn yield and receive LP tokens that can be used as collateral for Lumen Later loans
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <LendingSection />
        </div>
      </main>
    </div>
  );
}