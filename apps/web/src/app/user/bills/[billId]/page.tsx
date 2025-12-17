'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useBillDetail } from '@/hooks/api/use-bill-detail';
import { useBnplBill } from '@/hooks/web3/use-bnpl-bill';
import { BillDetailCard, IndexedBillData, OnChainBillData } from '@/components/bill/BillDetailCard';

export default function UserBillDetailPage({
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
  const { repayBill, isLoading: isRepaying } = useBnplBill();

  // Redirect if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
            <p className="text-gray-600 mb-4">Please connect your wallet to view bill details.</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
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
        <BackButton href="/user" />
        <div className="mt-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold">Bill Not Found</h2>
          <p className="text-gray-600 mt-2">{error || `Bill #${billId} not found`}</p>
        </div>
      </div>
    );
  }

  // Check if user owns this bill
  const isOwner = bill.user === publicKey;

  const handleRepay = async () => {
    try {
      await repayBill(billId);
      toast({
        title: 'Success',
        description: 'Bill repaid successfully!',
      });
      router.push('/user');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to repay bill',
        variant: 'destructive',
      });
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton href="/user" />
        </div>

        {/* Action Card for PAID bills (can repay) */}
        {isOwner && bill.status === 'PAID' && (
          <Card className="mb-6 border-primary-200 bg-primary-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Repayment Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                This bill is active and ready for repayment. Repay to complete the transaction.
              </p>
              <Button onClick={handleRepay} disabled={isRepaying}>
                {isRepaying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Repay $${(Number(bill.amount) / 1e7).toFixed(2)}`
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {!isOwner && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="py-4">
              <p className="text-yellow-700">
                You are viewing this bill as a guest. This bill belongs to another user.
              </p>
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
          viewAs="user"
          showParticipant="merchant"
        />
      </div>
    </div>
  );
}
