'use client';

import { Card } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import {
  Users,
  DollarSign,
  AlertCircle,
  Activity,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAdminDashboard } from '@/hooks/api/use-admin-dashboard';
import { MetricCard, MetricCardSkeleton } from '@/components/admin/MetricCard';
import { RecentActivityList } from '@/components/admin/RecentActivityList';

export default function AdminDashboard() {
  const router = useRouter();
  const { stats, isLoading, error, refetch } = useAdminDashboard();

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <BackButton href="/" />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your Lumen Later protocol</p>
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              title="Total Volume"
              value={stats?.tvl || '0'}
              prefix="$"
              icon={DollarSign}
              description="Cumulative bill volume"
            />
            <MetricCard
              title="Active Loans"
              value={stats?.activeLoans.toString() || '0'}
              icon={CreditCard}
              description={`${stats?.totalLoans || 0} total loans`}
            />
            <MetricCard
              title="Total Revenue"
              value={stats?.totalRevenue || '0'}
              prefix="$"
              icon={Activity}
              description="From fees collected"
            />
            <MetricCard
              title="Utilization Rate"
              value={`${stats?.utilizationRate || 0}`}
              suffix="%"
              icon={Activity}
              description="Active / Total loans"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/admin/loans')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <AlertCircle className="w-5 h-5 text-yellow-600 mb-2" />
            <p className="font-medium">Review Overdue Loans</p>
            <p className="text-sm text-gray-600 mt-1">
              {isLoading ? '...' : `${stats?.overdueLoans || 0} loans need attention`}
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/liquidity')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <DollarSign className="w-5 h-5 text-green-600 mb-2" />
            <p className="font-medium">Liquidity Pool</p>
            <p className="text-sm text-gray-600 mt-1">
              {isLoading ? '...' : `$${stats?.totalBorrowed || '0'} borrowed`}
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/merchants')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Users className="w-5 h-5 text-blue-600 mb-2" />
            <p className="font-medium">Merchants</p>
            <p className="text-sm text-gray-600 mt-1">
              {isLoading
                ? '...'
                : `${stats?.totalMerchants || 0} active, ${stats?.pendingMerchants || 0} pending`}
            </p>
          </button>
        </div>
      </Card>

      {/* Recent Activity */}
      <RecentActivityList
        activities={stats?.recentActivity || []}
        isLoading={isLoading}
        showViewAll
        onViewAll={() => router.push('/admin/activity')}
      />
    </div>
  );
}
