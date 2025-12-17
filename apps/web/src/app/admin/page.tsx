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
  TrendingUp,
  Droplets,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAdminDashboard } from '@/hooks/api/use-admin-dashboard';
import { useProtocolStats } from '@/hooks/api/use-protocol-stats';
import { MetricCard, MetricCardSkeleton } from '@/components/admin/MetricCard';
import { RecentActivityList } from '@/components/admin/RecentActivityList';

export default function AdminDashboard() {
  const router = useRouter();
  const { stats, isLoading, error, refetch } = useAdminDashboard();
  const {
    poolApyDaily,
    poolApyMonthly,
    poolTvl,
    poolUtilization,
    volumeTotal,
    feesTotal,
    feesToLp,
    billsTotal,
    billsPaid,
    billsRepaid,
    uniqueUsers,
    uniqueMerchants,
    repaymentRate,
    formatted,
    isLoading: isProtocolLoading,
    refetch: refetchProtocol,
  } = useProtocolStats();

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchProtocol()]);
  };

  const combinedLoading = isLoading || isProtocolLoading;

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
          onClick={handleRefresh}
          disabled={combinedLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${combinedLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Protocol Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {combinedLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Pool TVL"
              value={formatted.poolTvl}
              prefix="$"
              icon={DollarSign}
              description="Total Value Locked"
            />
            <MetricCard
              title="Pool APY"
              value={poolApyDaily?.toFixed(2) ?? '0.00'}
              suffix="%"
              icon={TrendingUp}
              trend={poolApyDaily && poolApyDaily > 5 ? 'up' : undefined}
              description={poolApyMonthly ? `30d: ${poolApyMonthly.toFixed(2)}%` : 'Annualized daily yield'}
            />
            <MetricCard
              title="Total Volume"
              value={formatted.volumeTotal}
              prefix="$"
              icon={BarChart3}
              description={`${billsTotal} bills processed`}
            />
            <MetricCard
              title="Total Fees"
              value={formatted.feesTotal}
              prefix="$"
              icon={Activity}
              description={`LP: $${formatted.feesToLp}`}
            />
          </>
        )}
      </div>

      {/* Bills & Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {combinedLoading ? (
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
              value={(billsPaid || 0).toString()}
              icon={CreditCard}
              description={`${billsRepaid || 0} repaid`}
            />
            <MetricCard
              title="Repayment Rate"
              value={repaymentRate?.toFixed(1) ?? '0.0'}
              suffix="%"
              icon={PieChart}
              trend={repaymentRate && repaymentRate > 90 ? 'up' : repaymentRate && repaymentRate < 70 ? 'down' : undefined}
              description="Successful repayments"
            />
            <MetricCard
              title="Unique Users"
              value={uniqueUsers.toString()}
              icon={Users}
              description={`${uniqueMerchants} merchants`}
            />
            <MetricCard
              title="Pool Utilization"
              value={poolUtilization?.toFixed(1) ?? '0.0'}
              suffix="%"
              icon={Droplets}
              description="Outstanding / TVL"
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
