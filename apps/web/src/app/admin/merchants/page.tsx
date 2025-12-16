'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, RefreshCw, Eye } from 'lucide-react';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useBnplAdmin } from '@/hooks/web3/use-bnpl-admin';
import { MerchantOnChainStatus, shortenAddress } from '@/lib/event-parser';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface MerchantWithInfo {
  address: string;
  merchantInfoId?: string;
  status: MerchantOnChainStatus;
  enrolledAt: string;
  approvedAt?: string;
  ledgerSequence: string;
  businessInfo?: {
    legalName: string;
    tradingName: string;
    category: string;
    monthlyVolume: number;
  };
  contactInfo?: {
    email: string;
    phone: string;
  };
  dbStatus?: string;
  riskScore?: number | null;
}

interface MerchantsResponse {
  merchants: MerchantWithInfo[];
  total: number;
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
  };
}

export default function MerchantManagement() {
  const { publicKey } = useWallet();
  const [authorizing, setAuthorizing] = useState<string | null>(null);
  const { toast } = useToast();
  const { updateMerchantStatus } = useBnplAdmin();

  const { data, isLoading, refetch } = useQuery<MerchantsResponse>({
    queryKey: ['indexer-merchants'],
    queryFn: async () => {
      const emptyResponse = { merchants: [], total: 0, stats: { pending: 0, approved: 0, rejected: 0, suspended: 0 } };
      try {
        const res = await fetch('/api/indexer/merchants');
        if (!res.ok) return emptyResponse;
        const data = await res.json();
        return data || emptyResponse;
      } catch {
        return emptyResponse;
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const merchants = data?.merchants || [];
  const stats = data?.stats || { pending: 0, approved: 0, rejected: 0, suspended: 0 };

  const handleUpdateStatus = async (merchantAddress: string, approve: boolean) => {
    if (!publicKey) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your admin wallet to update merchant status',
        variant: 'destructive',
      });
      return;
    }

    setAuthorizing(merchantAddress);

    try {
      await updateMerchantStatus(merchantAddress, approve ? 'Approved' : 'Rejected');

      toast({
        title: 'Success',
        description: `Merchant ${approve ? 'approved' : 'rejected'} on blockchain`,
      });

      // Refresh data after a short delay for indexer to catch up
      setTimeout(() => {
        refetch();
      }, 3000);
    } catch (error) {
      console.error('Status update failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update merchant status',
        variant: 'destructive',
      });
    } finally {
      setAuthorizing(null);
    }
  };

  const getStatusBadge = (status: MerchantOnChainStatus) => {
    const statusConfig = {
      Pending: { color: 'secondary', icon: Clock, text: 'Pending' },
      Approved: { color: 'default', icon: CheckCircle, text: 'Approved' },
      Rejected: { color: 'destructive', icon: XCircle, text: 'Rejected' },
      Suspended: { color: 'destructive', icon: AlertCircle, text: 'Suspended' },
      None: { color: 'secondary', icon: Clock, text: 'Unknown' },
    };

    const config = statusConfig[status] || statusConfig.None;
    const Icon = config.icon;

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <BackButton href="/admin" />
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">On-Chain Merchants</h1>
          <p className="text-gray-600 mt-1">
            Merchants registered on blockchain via event indexer
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total On-Chain</p>
          <p className="text-2xl font-bold">{merchants.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </Card>
      </div>

      {/* Merchant List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left p-4 font-medium">Business Name</th>
                <th className="text-left p-4 font-medium">Address</th>
                <th className="text-left p-4 font-medium">Category</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Enrolled At</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((merchant) => (
                <tr key={merchant.address} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">
                        {merchant.businessInfo?.tradingName || 'Unknown Business'}
                      </p>
                      {merchant.businessInfo?.legalName && (
                        <p className="text-xs text-gray-500">{merchant.businessInfo.legalName}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {shortenAddress(merchant.address)}
                    </code>
                    <button
                      className="ml-2 text-xs text-blue-600 hover:underline"
                      onClick={() => {
                        navigator.clipboard.writeText(merchant.address);
                        toast({ title: 'Copied', description: 'Address copied to clipboard' });
                      }}
                    >
                      Copy
                    </button>
                  </td>
                  <td className="p-4">
                    {merchant.businessInfo?.category ? (
                      <Badge variant="outline">{merchant.businessInfo.category}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">{getStatusBadge(merchant.status)}</td>
                  <td className="p-4">
                    <p className="text-sm text-gray-600">
                      {new Date(merchant.enrolledAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/merchants/${merchant.address}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          Detail
                        </Button>
                      </Link>
                      {merchant.status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(merchant.address, true)}
                            disabled={authorizing === merchant.address}
                          >
                            {authorizing === merchant.address ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Approve'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus(merchant.address, false)}
                            disabled={authorizing === merchant.address}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {merchant.status === 'Suspended' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(merchant.address, true)}
                          disabled={authorizing === merchant.address}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {merchants.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No merchants registered on blockchain yet</p>
              <p className="text-sm mt-2">
                Merchants will appear here after calling m_enroll on the contract
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
