'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/ui/back-button';
import {
  Search,
  Eye,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { useAdminLoans, type LoanData } from '@/hooks/api/use-admin-loans';
import { MetricCard, MetricCardSkeleton } from '@/components/admin/MetricCard';

type LoanStatus = 'all' | 'active' | 'created' | 'repaid' | 'liquidated';

function StatusBadge({ status }: { status: LoanData['status'] }) {
  const styles: Record<LoanData['status'], string> = {
    active: 'bg-yellow-100 text-yellow-700',
    created: 'bg-blue-100 text-blue-700',
    repaid: 'bg-green-100 text-green-700',
    liquidated: 'bg-red-100 text-red-700',
  };

  const labels: Record<LoanData['status'], string> = {
    active: 'Active (Borrowed)',
    created: 'Created',
    repaid: 'Repaid',
    liquidated: 'Liquidated',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function LoansManagement() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<LoanStatus>('all');

  const { loans, stats, pagination, isLoading, error, refetch } = useAdminLoans({
    page,
    pageSize: 20,
    status: filterStatus,
    search: searchTerm,
  });

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <BackButton href="/admin" />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loan Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage BNPL loans (bills)</p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Active Loans"
              value={stats?.totalActiveLoans.toString() || '0'}
              icon={CreditCard}
              description="Currently borrowed"
            />
            <MetricCard
              title="Total Value Locked"
              value={stats?.totalValueLocked || '0'}
              prefix="$"
              icon={DollarSign}
              description="In active loans"
            />
            <MetricCard
              title="Repaid Loans"
              value={stats?.totalRepaid.toString() || '0'}
              icon={CheckCircle}
              description="Successfully completed"
            />
            <MetricCard
              title="Pending Bills"
              value={stats?.totalCreated.toString() || '0'}
              icon={FileText}
              description="Created, not yet paid"
            />
          </>
        )}
      </div>

      {/* Loans Table */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-900">All Loans</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by address..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as LoanStatus);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-auto"
            >
              <option value="all">All Status</option>
              <option value="active">Active (Borrowed)</option>
              <option value="created">Created</option>
              <option value="repaid">Repaid</option>
              <option value="liquidated">Liquidated</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : loans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No loans found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Bill ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Borrower</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Merchant</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">#{loan.billId}</td>
                      <td className="py-3 px-4 text-sm font-mono" title={loan.borrower}>
                        {loan.borrowerShort}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono" title={loan.merchant}>
                        {loan.merchantShort}
                      </td>
                      <td className="py-3 px-4 text-sm">${loan.amount} USDC</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={loan.status} />
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(loan.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${loan.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="View on Stellar Expert"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                  {pagination.total} loans
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
