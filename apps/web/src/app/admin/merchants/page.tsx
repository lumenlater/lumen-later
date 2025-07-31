'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import CONTRACT_IDS from '@/config/contracts';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useBnplMerchant } from '@/hooks/web3/use-bnpl-merchant';
import { UnifiedMerchantStatus } from '@/types/merchant';
import { title } from 'process';

interface Merchant {
  id: string;
  applicantAddress: string;
  status: string;
  businessInfo: {
    legalName: string;
    tradingName: string;
    category: string;
    monthlyVolume: number;
  };
  submittedAt: string | null;
  reviewedAt: string | null;
  riskScore: number | null;
  isBlockchainCommitted: boolean;
  createdAt: string;
}

export default function MerchantManagement() {
  const {publicKey} = useWallet();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState<string | null>(null);
  const [merchantStatuses, setMerchantStatuses] = useState<Record<string, UnifiedMerchantStatus>>({});
  const { toast } = useToast();
  const { isApprovedMerchant, authorizeMerchant ,getMerchantData } = useBnplMerchant(publicKey || '');
  
  console.log('MerchantManagement component loaded');
  console.log('authorizeMerchant function:', authorizeMerchant);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      console.log('Fetching merchants...');
      console.log('Contract ID:', CONTRACT_IDS.BNPL_CORE);
      
      const url = `/api/merchant/applications?contractId=${CONTRACT_IDS.BNPL_CORE}`;
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.applications) {
        setMerchants(data.applications || []);
        console.log('Merchants loaded:', data.applications?.length || 0);
        
        // Check blockchain status for each merchant
        const statuses: Record<string, UnifiedMerchantStatus> = {};
        for (const merchant of (data.applications || [])) {
          try {
            const data = await getMerchantData();
            if (data) {
              statuses[merchant.applicantAddress] = data.status;
            }
          } catch (error) {
            console.log('Error getting merchant status:', error);
            statuses[merchant.applicantAddress] = UnifiedMerchantStatus.None;
          }
        }
        setMerchantStatuses(statuses);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to fetch merchants:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch merchants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (merchant: Merchant, authorized: boolean) => {
    console.log('handleAuthorize called:', { merchant, authorized });
    
    if (!publicKey) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your admin wallet to authorize merchants',
        variant: 'destructive',
      });
      return;
    }

    console.log('Connected wallet:', publicKey);
    setAuthorizing(merchant.id);

    try {
      // First, update the database
      console.log('Updating database...');
      
      // If approving, also authorize on blockchain
      if (authorized) {
        try {
          console.log('Authorizing merchant on blockchain:', merchant.applicantAddress);
          await authorizeMerchant(merchant.applicantAddress, true);
          
          toast({
            title: 'Success',
            description: 'Merchant authorized on blockchain',
          });
        } catch (blockchainError) {
          console.error('Blockchain authorization failed:', blockchainError);
          toast({
            title: 'Blockchain Error',
            description: 'Database updated but blockchain authorization failed. Please try again.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Merchant Rejected',
          description: 'Merchant application has been rejected',
        });
      }

      // Refresh the list
      await fetchMerchants();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to authorize merchant',
        variant: 'destructive',
      });
    } finally {
      setAuthorizing(null);
    }
  };

  const getStatusBadge = (status: string, isBlockchainCommitted: boolean) => {
    const statusConfig = {
      DRAFT: { color: 'secondary', icon: Clock },
      SUBMITTED: { color: 'secondary', icon: Clock },
      UNDER_REVIEW: { color: 'secondary', icon: AlertCircle },
      DOCUMENTS_NEEDED: { color: 'destructive', icon: AlertCircle },
      APPROVED: { color: 'default', icon: CheckCircle },
      REJECTED: { color: 'destructive', icon: XCircle },
      SUSPENDED: { color: 'destructive', icon: XCircle },
      // Support for new contract status values
      Pending: { color: 'secondary', icon: Clock },
      Approved: { color: 'default', icon: CheckCircle },
      Rejected: { color: 'destructive', icon: XCircle },
      Suspended: { color: 'destructive', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.color as any}>
          <Icon className="w-3 h-3 mr-1" />
          {status}
        </Badge>
        {status === 'APPROVED' && isBlockchainCommitted && (
          <Badge variant="outline" className="text-green-600">
            On-chain
          </Badge>
        )}
      </div>
    );
  };

  const getRiskBadge = (riskScore: number | null) => {
    if (riskScore === null) return null;

    const color = riskScore < 30 ? 'default' : riskScore < 70 ? 'secondary' : 'destructive';
    return <Badge variant={color as any}>Risk: {riskScore}</Badge>;
  };

  if (loading) {
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
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Merchant Management</h1>
        <p className="text-gray-600 mt-1">Review and authorize merchant applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Applications</p>
          <p className="text-2xl font-bold">{merchants.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Pending Review</p>
          <p className="text-2xl font-bold">
            {merchants.filter(m => ['SUBMITTED', 'UNDER_REVIEW'].includes(m.status)).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {merchants.filter(m => m.status === 'APPROVED').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">On Blockchain</p>
          <p className="text-2xl font-bold text-blue-600">
            {merchants.filter(m => m.isBlockchainCommitted).length}
          </p>
        </Card>
      </div>

      {/* Merchant List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left p-4 font-medium">Business</th>
                <th className="text-left p-4 font-medium">Address</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Risk</th>
                <th className="text-left p-4 font-medium">Volume</th>
                <th className="text-left p-4 font-medium">Submitted</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((merchant) => (
                <tr key={merchant.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{merchant.businessInfo.tradingName}</p>
                      <p className="text-sm text-gray-600">{merchant.businessInfo.category}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-mono text-sm">
                      {merchant.applicantAddress.slice(0, 4)}...{merchant.applicantAddress.slice(-4)}
                    </p>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(merchant.status, merchant.isBlockchainCommitted)}
                  </td>
                  <td className="p-4">
                    {getRiskBadge(merchant.riskScore)}
                  </td>
                  <td className="p-4">
                    <p className="text-sm">${merchant.businessInfo.monthlyVolume.toLocaleString()}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-gray-600">
                      {merchant.submittedAt 
                        ? new Date(merchant.submittedAt).toLocaleDateString()
                        : 'Not submitted'}
                    </p>
                  </td>
                  <td className="p-4">
                    {merchant.status === 'SUBMITTED' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAuthorize(merchant, true)}
                          disabled={authorizing === merchant.id}
                        >
                          {authorizing === merchant.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Approve'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAuthorize(merchant, false)}
                          disabled={authorizing === merchant.id}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {merchant.status === 'APPROVED' && (
                      <>
                        {merchantStatuses[merchant.applicantAddress] === UnifiedMerchantStatus.Approved ? (
                          <p className="text-sm text-green-600">✓ Authorized on Chain</p>
                        ) : merchantStatuses[merchant.applicantAddress] === UnifiedMerchantStatus.Pending ? (
                          <p className="text-sm text-yellow-600">⏳ Pending on Chain</p>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAuthorize(merchant, true)}
                            disabled={authorizing === merchant.id}
                          >
                            {authorizing === merchant.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Authorize on Chain'
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {merchants.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No merchant applications found
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}