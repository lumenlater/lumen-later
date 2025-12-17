'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle, DollarSign, CheckCircle } from 'lucide-react';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useBillDetail } from '@/hooks/api/use-bill-detail';
import { BillDetailCard, IndexedBillData, OnChainBillData } from '@/components/bill/BillDetailCard';

export default function MerchantBillDetailPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = use(params);
  const router = useRouter();
  const { publicKey, isConnected } = useWallet();
  const { toast } = useToast();
  const {
    bill,
    isLoading,
    error,
    onChainData,
    isLoadingOnChain,
    onChainError,
    verifyOnChain,
  } = useBillDetail(billId);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
            <p className="text-gray-600 mb-4">Please connect your wallet to view bill details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <BackButton href="/merchant" />
        <div className="mt-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold">Bill Not Found</h2>
          <p className="text-gray-600 mt-2">{error || `Bill #${billId} not found`}</p>
        </div>
      </div>
    );
  }

  // Check if merchant owns this bill
  const isMerchant = bill.merchant === publicKey;

  const handleReport = () => {
    toast({
      title: 'Report Submitted',
      description: 'Thank you for reporting. Our team will investigate the discrepancy.',
    });
  };

  // Transform to BillDetailCard format
  const indexedData: IndexedBillData = {
    billId: bill.billId,
    merchant: bill.merchant,
    user: bill.user,
    amount: bill.amount,
    orderId: bill.orderId,
    status: bill.status,
    createdAt: bill.createdAt,
    paidAt: bill.paidAt,
    repaidAt: bill.repaidAt,
    liquidatedAt: bill.liquidatedAt,
    txHash: bill.txHash,
    merchantPayout: bill.merchantPayout,
    description: bill.description,
    merchantName: bill.merchantName,
  };

  const transformedOnChainData: OnChainBillData | null = onChainData
    ? {
        id: onChainData.id,
        merchant: onChainData.merchant,
        user: onChainData.user,
        principal: onChainData.principal,
        order_id: onChainData.order_id,
        status: onChainData.status,
        created_at: onChainData.created_at,
        paid_at: onChainData.paid_at,
      }
    : null;

  // Calculate fee deducted
  const feeDeducted = bill.merchantPayout
    ? Number(bill.amount) - Number(bill.merchantPayout)
    : Math.floor(Number(bill.amount) * 0.015);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton href="/merchant" />
        </div>

        {!isMerchant && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="py-4">
              <p className="text-yellow-700">
                You are viewing this bill as a guest. This bill belongs to another merchant.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Revenue Summary for Merchant */}
        {isMerchant && (bill.status === 'PAID' || bill.status === 'REPAID' || bill.status === 'LIQUIDATED') && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <DollarSign className="w-5 h-5" />
                Revenue Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Bill Amount</p>
                  <p className="text-xl font-bold">${(Number(bill.amount) / 1e7).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fee (1.5%)</p>
                  <p className="text-xl font-bold text-red-600">
                    -${(feeDeducted / 1e7).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">You Received</p>
                  <p className="text-xl font-bold text-green-700">
                    ${bill.merchantPayout
                      ? (Number(bill.merchantPayout) / 1e7).toFixed(2)
                      : ((Number(bill.amount) - feeDeducted) / 1e7).toFixed(2)}
                  </p>
                </div>
              </div>
              {bill.status === 'REPAID' && (
                <div className="mt-4 flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>Customer has completed repayment</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <BillDetailCard
          indexedData={indexedData}
          onChainData={transformedOnChainData}
          isLoadingOnChain={isLoadingOnChain}
          onChainError={onChainError}
          onRefreshOnChain={verifyOnChain}
          onReport={handleReport}
          viewAs="merchant"
          showParticipant="user"
        />
      </div>
    </div>
  );
}
