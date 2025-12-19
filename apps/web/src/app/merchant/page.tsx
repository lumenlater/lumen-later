'use client';

import { useWallet } from '@/hooks/web3/use-wallet';
import { useBillAPI } from '@/hooks/api/use-bill-api';
import { useBnplBill } from '@/hooks/web3/use-bnpl-bill';
import { useBillEvents } from '@/hooks/web3/use-bill-events';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Store, Plus, Eye, DollarSign, FileText, CheckCircle, TrendingUp, Settings, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import CONTRACT_IDS from '@/config/contracts';

interface MerchantStats {
  billStats?: {
    total: number;
    totalVolume: number;
    paidVolume: number;
    actualRevenue: number;
    feesDeducted: number;
    byStatus: {
      created: number;
      paid: number;
      repaid: number;
      liquidated: number;
    };
  };
}

export default function MerchantPage() {
  const { isConnected, publicKey } = useWallet();
  const router = useRouter();
  const { toast } = useToast();
  const { createBill, updateBillWithOnChainId, useBillsByMerchant } = useBillAPI();
  const { createBill: createOnChainBill } = useBnplBill();
  const { useBillEventsByMerchant } = useBillEvents();
  
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    userAddress: '',
    amount: '',
    description: '',
    merchantName: ''
  });

  const { data: offChainBills, isLoading: billsLoading } = useBillsByMerchant(publicKey);
  const { data: onChainBills, isLoading: onChainLoading } = useBillEventsByMerchant(publicKey);

  // Fetch merchant stats from indexer (actual revenue, volume breakdown)
  const { data: merchantData } = useQuery<MerchantStats>({
    queryKey: ['merchant-stats', publicKey],
    queryFn: async () => {
      if (!publicKey) return {};
      const res = await fetch(`/api/indexer/merchants/${publicKey}`);
      if (!res.ok) return {};
      const data = await res.json();
      return data.merchant || {};
    },
    enabled: !!publicKey,
    refetchInterval: 30000,
  });

  // Combine on-chain and off-chain bills
  const bills = useMemo(() => {
    if (!offChainBills) return [];
    
    // Create a map of on-chain bills by order_id (which is MongoDB ID)
    const onChainMap = new Map(
      (onChainBills || []).map(bill => [bill.order_id, bill])
    );
    
    // Enhance off-chain bills with on-chain data
    return offChainBills.map(offChainBill => {
      const onChainBill = onChainMap.get(offChainBill.id);
      return {
        ...offChainBill,
        onChainBillId: onChainBill?.bill_id,
        txHash: onChainBill?.txHash,
        onChainCreatedAt: onChainBill?.created_at,
      };
    });
  }, [offChainBills, onChainBills]);

  if (!isConnected) {
    router.push('/');
    return null;
  }

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) return;
    
    setIsCreating(true);
    
    try {
      // Step 1: Create bill in MongoDB
      const offChainBill = await createBill.mutateAsync({
        merchantAddress: publicKey,
        userAddress: formData.userAddress,
        amount: parseFloat(formData.amount),
        description: formData.description,
        merchantName: formData.merchantName,
        contractId: CONTRACT_IDS.BNPL_CORE
      });

      // Step 2: Create bill on-chain with MongoDB ID
      const onChainResult = await createOnChainBill(
        formData.userAddress,
        formData.amount,
        offChainBill.id // Pass MongoDB ID as order_id
      );

      if (onChainResult && onChainResult.billId !== undefined) {
        // Step 3: Update MongoDB with on-chain bill ID
        await updateBillWithOnChainId.mutateAsync({
          id: offChainBill.id,
          onChainBillId: onChainResult.billId
        });

        toast({
          title: 'Bill created successfully',
          description: `Bill #${onChainResult.billId} created for ${formData.amount} USDC`
        });

        // Reset form
        setFormData({
          userAddress: '',
          amount: '',
          description: '',
          merchantName: ''
        });
        
        // Refetch bills to show the new one
        router.refresh();
      } else {
        toast({
          title: 'Bill creation pending',
          description: 'The bill was created but is awaiting blockchain confirmation.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to create bill',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/merchant/settings/api-keys')}
          >
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-2">Merchant Dashboard</h1>
        <p className="text-gray-600 mb-8">Create and manage Lumen Later bills for your customers</p>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Bills Created */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Bills Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {merchantData?.billStats?.total || bills?.length || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {merchantData?.billStats?.byStatus?.created || 0} pending
              </p>
            </CardContent>
          </Card>

          {/* Payments Received */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Payments Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(merchantData?.billStats?.byStatus?.paid || 0) +
                 (merchantData?.billStats?.byStatus?.repaid || 0) +
                 (merchantData?.billStats?.byStatus?.liquidated || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {merchantData?.billStats?.byStatus?.created || 0} awaiting payment
              </p>
            </CardContent>
          </Card>

          {/* Total Volume */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${merchantData?.billStats?.paidVolume
                  ? (merchantData.billStats.paidVolume / 1e7).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : bills?.reduce((sum, bill) => sum + bill.amount, 0).toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Processed volume (before fees)
              </p>
            </CardContent>
          </Card>

          {/* Actual Revenue */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Actual Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                ${merchantData?.billStats?.actualRevenue
                  ? (merchantData.billStats.actualRevenue / 1e7).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '0.00'}
              </div>
              <p className="text-xs text-green-600 mt-1">
                After 1.5% fee (-${merchantData?.billStats?.feesDeducted
                  ? (merchantData.billStats.feesDeducted / 1e7).toFixed(2)
                  : '0.00'})
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Create Bill Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Bill</CardTitle>
              <CardDescription>
                Create a Lumen Later bill for your customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBill} className="space-y-4">
                <div>
                  <Label htmlFor="merchantName">Business Name</Label>
                  <Input
                    id="merchantName"
                    value={formData.merchantName}
                    onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                    placeholder="Your Business Name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="userAddress">Customer Wallet Address</Label>
                  <Input
                    id="userAddress"
                    value={formData.userAddress}
                    onChange={(e) => setFormData({ ...formData, userAddress: e.target.value })}
                    placeholder="G..."
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount">Amount (USDC)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="100.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Purchase description"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isCreating || createBill.isPending}
                >
                  {isCreating ? 'Creating...' : 'Create Bill'}
                  <Plus className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Bills */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bills</CardTitle>
              <CardDescription>
                Bills you've created for customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billsLoading || onChainLoading ? (
                <p className="text-gray-600">Loading bills...</p>
              ) : bills && bills.length > 0 ? (
                <div className="space-y-3">
                  {bills.slice(0, 5).map((bill) => (
                    <div key={bill.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{bill.description}</p>
                          <p className="text-sm text-gray-500">
                            {bill.userAddress.slice(0, 4)}...{bill.userAddress.slice(-4)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${bill.amount.toFixed(2)}</p>
                          {bill.onChainBillId ? (
                            <Link
                              href={`/merchant/bills/${bill.onChainBillId}`}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 justify-end"
                            >
                              #{bill.onChainBillId}
                              <Eye className="w-3 h-3" />
                            </Link>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No bills created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </>
  );
}