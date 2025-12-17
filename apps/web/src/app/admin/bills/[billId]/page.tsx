'use client';

import { use } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle, Users, DollarSign, Building2 } from 'lucide-react';
import { useBillDetail } from '@/hooks/api/use-bill-detail';
import { BillDetailCard, IndexedBillData, OnChainBillData } from '@/components/bill/BillDetailCard';
import { shortenAddress } from '@/lib/event-parser';
import Link from 'next/link';

export default function AdminBillDetailPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = use(params);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="p-8">
        <BackButton href="/admin/loans" />
        <div className="mt-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold">Bill Not Found</h2>
          <p className="text-gray-600 mt-2">{error || `Bill #${billId} not found`}</p>
        </div>
      </div>
    );
  }

  const handleReport = () => {
    toast({
      title: 'Investigation Started',
      description: 'A support ticket has been created for this discrepancy.',
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

  // Calculate financials
  const amount = Number(bill.amount);
  const merchantPayout = bill.merchantPayout ? Number(bill.merchantPayout) : Math.floor(amount * 0.985);
  const protocolFee = amount - merchantPayout;

  return (
    <div>
      <div className="mb-6">
        <BackButton href="/admin/loans" />
      </div>

      {/* Admin Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bill #{bill.billId}</h1>
        <p className="text-gray-600 mt-1">Administrative view with full details</p>
      </div>

      {/* Admin Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Participants Quick View */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Merchant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/admin/merchants/${bill.merchant}`}
              className="text-blue-600 hover:underline font-mono text-sm"
            >
              {shortenAddress(bill.merchant)}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="w-4 h-4" />
              User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <code className="font-mono text-sm">{shortenAddress(bill.user)}</code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Protocol Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-green-600">
              ${(protocolFee / 1e7).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">1.5% of ${(amount / 1e7).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Breakdown for Admin */}
      {(bill.status === 'PAID' || bill.status === 'REPAID' || bill.status === 'LIQUIDATED') && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Financial Breakdown</CardTitle>
            <CardDescription>Complete transaction flow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Bill Amount (User Owes)</span>
                <span className="font-bold">${(amount / 1e7).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Merchant Received</span>
                <span className="font-bold text-blue-600">${(merchantPayout / 1e7).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Protocol Fee (1.5%)</span>
                <span className="font-bold text-green-600">${(protocolFee / 1e7).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm text-gray-500">
                <span>└ 70% to LP Pool</span>
                <span>${(protocolFee * 0.7 / 1e7).toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm text-gray-500">
                <span>└ 20% to Treasury</span>
                <span>${(protocolFee * 0.2 / 1e7).toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm text-gray-500">
                <span>└ 10% to Insurance</span>
                <span>${(protocolFee * 0.1 / 1e7).toFixed(4)}</span>
              </div>
              {bill.amountRepaid && (
                <div className="flex justify-between items-center py-2 border-t mt-2">
                  <span className="text-gray-600">User Repaid (with fees)</span>
                  <span className="font-bold">${(Number(bill.amountRepaid) / 1e7).toFixed(2)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Contract ID</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {shortenAddress(bill.contractId)}
              </code>
            </div>
            <div>
              <p className="text-gray-500">Ledger Sequence</p>
              <p className="font-mono">#{bill.ledgerSequence}</p>
            </div>
            <div>
              <p className="text-gray-500">Database ID</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{bill.id}</code>
            </div>
            <div>
              <p className="text-gray-500">Loan ID</p>
              <Badge variant="outline">
                {bill.status === 'PAID' || bill.status === 'REPAID' ? 'Active' : 'N/A'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Bill Detail Card */}
      <BillDetailCard
        indexedData={indexedData}
        onChainData={transformedOnChainData}
        isLoadingOnChain={isLoadingOnChain}
        onChainError={onChainError}
        onRefreshOnChain={verifyOnChain}
        onReport={handleReport}
        viewAs="admin"
        showParticipant="both"
      />
    </div>
  );
}
