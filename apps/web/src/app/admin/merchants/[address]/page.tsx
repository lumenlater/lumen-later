'use client';

import { use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  ExternalLink,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useBnplAdmin } from '@/hooks/web3/use-bnpl-admin';
import { MerchantOnChainStatus, shortenAddress } from '@/lib/event-parser';
import { useQuery } from '@tanstack/react-query';

interface MerchantEvent {
  id: string;
  action: string;
  timestamp: string;
  ledgerSequence: string;
  transactionHash: string;
}

interface MerchantApplication {
  id: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  riskScore?: number;
  businessInfo: {
    legalName: string;
    tradingName: string;
    registrationNumber: string;
    category: string;
    monthlyVolume: number;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  contactInfo: {
    primaryContact: {
      name: string;
      email: string;
      phone: string;
    };
    supportEmail?: string;
    websiteUrl?: string;
  };
  documents?: {
    businessLicense?: string;
    taxDocument?: string;
    identityDocument?: string;
  };
  bankingInfo?: {
    bankName: string;
    accountType: string;
  };
  isBlockchainCommitted: boolean;
  blockchainTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

interface MerchantDetail {
  address: string;
  merchantInfoId?: string;
  status: MerchantOnChainStatus;
  enrolledAt: string;
  approvedAt?: string;
  ledgerSequence: string;
  events: MerchantEvent[];
  application?: MerchantApplication;
}

interface MerchantDetailResponse {
  merchant: MerchantDetail;
}

export default function MerchantDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const { updateMerchantStatus } = useBnplAdmin();

  const { data, isLoading, refetch } = useQuery<MerchantDetailResponse>({
    queryKey: ['merchant-detail', address],
    queryFn: async () => {
      const res = await fetch(`/api/indexer/merchants/${address}`);
      if (!res.ok) throw new Error('Failed to fetch merchant');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const merchant = data?.merchant;

  const handleUpdateStatus = async (approve: boolean) => {
    if (!publicKey) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your admin wallet',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateMerchantStatus(address, approve ? 'Approved' : 'Rejected');
      toast({
        title: 'Success',
        description: `Merchant ${approve ? 'approved' : 'rejected'} on blockchain`,
      });
      setTimeout(() => refetch(), 3000);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast({ title: 'Copied', description: 'Address copied to clipboard' });
  };

  const getStatusBadge = (status: MerchantOnChainStatus) => {
    const config = {
      Pending: { color: 'secondary', icon: Clock, text: 'Pending' },
      Approved: { color: 'default', icon: CheckCircle, text: 'Approved' },
      Rejected: { color: 'destructive', icon: XCircle, text: 'Rejected' },
      Suspended: { color: 'destructive', icon: AlertCircle, text: 'Suspended' },
      None: { color: 'secondary', icon: Clock, text: 'Unknown' },
    };
    const { color, icon: Icon, text } = config[status] || config.None;
    return (
      <Badge variant={color as any} className="flex items-center gap-1 text-base px-3 py-1">
        <Icon className="w-4 h-4" />
        {text}
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

  if (!merchant) {
    return (
      <div className="p-8">
        <BackButton href="/admin/merchants" />
        <div className="mt-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold">Merchant Not Found</h2>
          <p className="text-gray-600 mt-2">
            No merchant found with address: {shortenAddress(address)}
          </p>
        </div>
      </div>
    );
  }

  const app = merchant.application;
  const biz = app?.businessInfo;
  const contact = app?.contactInfo;

  return (
    <div>
      <div className="mb-6">
        <BackButton href="/admin/merchants" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {biz?.tradingName || 'Unknown Business'}
          </h1>
          {biz?.legalName && (
            <p className="text-gray-600 mt-1">{biz.legalName}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              {shortenAddress(address)}
            </code>
            <Button size="sm" variant="ghost" onClick={copyAddress}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge(merchant.status)}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Action Buttons for Pending */}
      {merchant.status === 'Pending' && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Action Required</p>
                <p className="text-sm text-gray-600">
                  This merchant is awaiting approval
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleUpdateStatus(true)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button variant="destructive" onClick={() => handleUpdateStatus(false)}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Trading Name</p>
                <p className="font-medium">{biz?.tradingName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Legal Name</p>
                <p className="font-medium">{biz?.legalName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registration Number</p>
                <p className="font-medium">{biz?.registrationNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">
                  {biz?.category ? (
                    <Badge variant="outline">{biz.category}</Badge>
                  ) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Volume</p>
                <p className="font-medium">
                  {biz?.monthlyVolume
                    ? `$${biz.monthlyVolume.toLocaleString()}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Risk Score</p>
                <p className="font-medium">
                  {app?.riskScore != null ? (
                    <Badge
                      variant={
                        app.riskScore < 30
                          ? 'default'
                          : app.riskScore < 70
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {app.riskScore}
                    </Badge>
                  ) : '-'}
                </p>
              </div>
            </div>
            {biz?.address && (
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Address
                </p>
                <p className="font-medium">
                  {[
                    biz.address.street,
                    biz.address.city,
                    biz.address.state,
                    biz.address.postalCode,
                    biz.address.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact?.primaryContact && (
              <>
                <div>
                  <p className="text-sm text-gray-500">Primary Contact</p>
                  <p className="font-medium">{contact.primaryContact.name || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </p>
                    <p className="font-medium">{contact.primaryContact.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone
                    </p>
                    <p className="font-medium">{contact.primaryContact.phone || '-'}</p>
                  </div>
                </div>
              </>
            )}
            {contact?.supportEmail && (
              <div>
                <p className="text-sm text-gray-500">Support Email</p>
                <p className="font-medium">{contact.supportEmail}</p>
              </div>
            )}
            {contact?.websiteUrl && (
              <div>
                <p className="text-sm text-gray-500">Website</p>
                <a
                  href={contact.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  {contact.websiteUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {!contact?.primaryContact && (
              <p className="text-gray-400 text-center py-4">No contact information available</p>
            )}
          </CardContent>
        </Card>

        {/* Blockchain Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Blockchain Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">On-Chain Status</p>
                <p className="font-medium">{merchant.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ledger Sequence</p>
                <p className="font-medium">#{merchant.ledgerSequence}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Enrolled At</p>
                <p className="font-medium">
                  {new Date(merchant.enrolledAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved At</p>
                <p className="font-medium">
                  {merchant.approvedAt
                    ? new Date(merchant.approvedAt).toLocaleString()
                    : '-'}
                </p>
              </div>
            </div>
            {merchant.merchantInfoId && (
              <div>
                <p className="text-sm text-gray-500">Merchant Info ID (MongoDB)</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block mt-1">
                  {merchant.merchantInfoId}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Status */}
        {app && (
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>MongoDB application record</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">DB Status</p>
                  <Badge variant="outline">{app.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Blockchain Committed</p>
                  <Badge variant={app.isBlockchainCommitted ? 'default' : 'secondary'}>
                    {app.isBlockchainCommitted ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Submitted At</p>
                  <p className="font-medium">
                    {new Date(app.submittedAt).toLocaleString()}
                  </p>
                </div>
                {app.reviewedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Reviewed At</p>
                    <p className="font-medium">
                      {new Date(app.reviewedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              {app.rejectionReason && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Rejection Reason</p>
                  <p className="text-red-700">{app.rejectionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Event History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Event History</CardTitle>
          <CardDescription>
            Blockchain events for this merchant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {merchant.events.length > 0 ? (
            <div className="space-y-3">
              {merchant.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {event.action.replace('m_', '').replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Ledger #{event.ledgerSequence}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${event.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    View Tx
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No events recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
