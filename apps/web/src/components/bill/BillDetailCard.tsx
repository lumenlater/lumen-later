'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { shortenAddress } from '@/lib/event-parser';

export type BillStatus = 'CREATED' | 'PAID' | 'REPAID' | 'LIQUIDATED';

export interface IndexedBillData {
  billId: string;
  merchant: string;
  user: string;
  amount: string;
  orderId: string;
  status: BillStatus;
  createdAt: string;
  paidAt: string | null;
  repaidAt: string | null;
  liquidatedAt: string | null;
  txHash: string;
  merchantPayout?: string | null;
  // Off-chain data from MongoDB
  description?: string | null;
  merchantName?: string | null;
}

export interface OnChainBillData {
  id: string;
  merchant: string;
  user: string;
  principal: string;
  order_id: string;
  status: string;
  created_at: string;
  paid_at: string;
}

export interface BillDetailCardProps {
  indexedData: IndexedBillData;
  onChainData?: OnChainBillData | null;
  isLoadingOnChain?: boolean;
  onChainError?: string | null;
  onRefreshOnChain?: () => void;
  onReport?: () => void;
  viewAs: 'user' | 'merchant' | 'admin';
  showParticipant?: 'user' | 'merchant' | 'both';
}

const statusConfig: Record<BillStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  CREATED: { label: 'Pending', variant: 'outline', icon: <Clock className="w-4 h-4" /> },
  PAID: { label: 'Active', variant: 'secondary', icon: <Clock className="w-4 h-4" /> },
  REPAID: { label: 'Completed', variant: 'default', icon: <CheckCircle className="w-4 h-4" /> },
  LIQUIDATED: { label: 'Liquidated', variant: 'destructive', icon: <AlertTriangle className="w-4 h-4" /> },
};

function formatAmount(amount: string): string {
  return (Number(amount) / 1e7).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
}

export function BillDetailCard({
  indexedData,
  onChainData,
  isLoadingOnChain,
  onChainError,
  onRefreshOnChain,
  onReport,
  viewAs,
  showParticipant = 'both',
}: BillDetailCardProps) {
  const { toast } = useToast();
  const status = statusConfig[indexedData.status];

  // Normalize status for comparison (PAID -> Paid, REPAID -> Repaid, etc.)
  const normalizeStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Check for data mismatch between indexed and on-chain
  const hasMismatch = onChainData && (
    indexedData.amount !== onChainData.principal ||
    indexedData.merchant !== onChainData.merchant ||
    indexedData.user !== onChainData.user ||
    normalizeStatus(indexedData.status) !== normalizeStatus(onChainData.status)
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  return (
    <div className="space-y-6">
      {/* Main Bill Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                Bill #{indexedData.billId}
                <Badge variant={status.variant} className="flex items-center gap-1">
                  {status.icon}
                  {status.label}
                </Badge>
              </CardTitle>
              {indexedData.merchantName && (
                <p className="text-lg font-medium text-gray-700 mt-1">
                  {indexedData.merchantName}
                </p>
              )}
              {indexedData.description && (
                <CardDescription className="mt-1">{indexedData.description}</CardDescription>
              )}
              {!indexedData.description && (
                <CardDescription>Order ID: {indexedData.orderId || 'N/A'}</CardDescription>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">${formatAmount(indexedData.amount)}</p>
              {indexedData.merchantPayout && viewAs === 'merchant' && (
                <p className="text-sm text-green-600">
                  Received: ${formatAmount(indexedData.merchantPayout)}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{formatDate(indexedData.createdAt)}</p>
            </div>
            {indexedData.paidAt && (
              <div>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="font-medium">{formatDate(indexedData.paidAt)}</p>
              </div>
            )}
            {indexedData.repaidAt && (
              <div>
                <p className="text-sm text-gray-500">Repaid</p>
                <p className="font-medium">{formatDate(indexedData.repaidAt)}</p>
              </div>
            )}
            {indexedData.liquidatedAt && (
              <div>
                <p className="text-sm text-gray-500">Liquidated</p>
                <p className="font-medium text-red-600">{formatDate(indexedData.liquidatedAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      {showParticipant !== 'both' ? null : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Participants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(showParticipant === 'both' || showParticipant === 'merchant') && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Merchant</p>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {shortenAddress(indexedData.merchant)}
                  </code>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(indexedData.merchant, 'Merchant address')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
            {(showParticipant === 'both' || showParticipant === 'user') && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">User</p>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {shortenAddress(indexedData.user)}
                  </code>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(indexedData.user, 'User address')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* On-Chain Verification */}
      <Card className={hasMismatch ? 'border-red-300 bg-red-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              On-Chain Verification
              {hasMismatch && <AlertTriangle className="w-5 h-5 text-red-500" />}
            </CardTitle>
            {onRefreshOnChain && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRefreshOnChain}
                disabled={isLoadingOnChain}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingOnChain ? 'animate-spin' : ''}`} />
                Verify
              </Button>
            )}
          </div>
          <CardDescription>
            Compare indexed data with on-chain contract state
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOnChain ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading on-chain data...</span>
            </div>
          ) : onChainError ? (
            <div className="flex items-center gap-2 text-red-600 py-4">
              <AlertCircle className="w-5 h-5" />
              <span>{onChainError}</span>
            </div>
          ) : onChainData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="font-medium text-gray-500">Field</div>
                <div className="font-medium text-gray-500">Indexed</div>
                <div className="font-medium text-gray-500">On-Chain</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>Amount</div>
                <div>${formatAmount(indexedData.amount)}</div>
                <div className={indexedData.amount !== onChainData.principal ? 'text-red-600 font-bold' : ''}>
                  ${formatAmount(onChainData.principal)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>Merchant</div>
                <div>{shortenAddress(indexedData.merchant)}</div>
                <div className={indexedData.merchant !== onChainData.merchant ? 'text-red-600 font-bold' : ''}>
                  {shortenAddress(onChainData.merchant)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>User</div>
                <div>{shortenAddress(indexedData.user)}</div>
                <div className={indexedData.user !== onChainData.user ? 'text-red-600 font-bold' : ''}>
                  {shortenAddress(onChainData.user)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>Status</div>
                <div>{indexedData.status}</div>
                <div className={normalizeStatus(indexedData.status) !== normalizeStatus(onChainData.status) ? 'text-red-600 font-bold' : ''}>
                  {onChainData.status}
                </div>
              </div>

              {hasMismatch && onReport && (
                <div className="mt-4 p-4 bg-red-100 rounded-lg">
                  <p className="text-red-700 font-medium mb-2">
                    Data mismatch detected between indexed and on-chain data.
                  </p>
                  <Button variant="destructive" onClick={onReport}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Discrepancy
                  </Button>
                </div>
              )}

              {!hasMismatch && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>All data matches on-chain state</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 py-4">
              Click &quot;Verify&quot; to compare with on-chain data
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transaction Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              {shortenAddress(indexedData.txHash)}
            </code>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(indexedData.txHash, 'Transaction hash')}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${indexedData.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View on Explorer
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
