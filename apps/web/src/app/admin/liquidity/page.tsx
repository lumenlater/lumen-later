'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/ui/back-button';
import {
  Pause,
  Play,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Droplets,
  Users,
} from 'lucide-react';
import { useLiquidityPool } from '@/hooks/web3/use-liquidity-pool';
import { useAdminLiquidity } from '@/hooks/api/use-admin-liquidity';
import { MetricCard, MetricCardSkeleton } from '@/components/admin/MetricCard';

export default function LiquidityManagement() {
  const [isPaused, setIsPaused] = useState(false);
  const [revenueShare, setRevenueShare] = useState('3');

  // Real-time contract data
  const {
    poolStats,
    totalSupply,
    totalBorrowed: contractTotalBorrowed,
    utilizationRatio,
    isLoading: isPoolLoading,
    error: poolError,
    refreshPoolStats,
  } = useLiquidityPool();

  // Indexed event data
  const {
    stats: liquidityStats,
    isLoading: isStatsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useAdminLiquidity();

  const isLoading = isPoolLoading || isStatsLoading;
  const error = poolError || statsError;

  // Format bigint to display string
  const formatBigInt = (value: bigint | null | undefined): string => {
    if (!value) return '0.00';
    const num = Number(value) / 1e7;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format LP tokens
  const formatLPTokens = (value: bigint | null | undefined): string => {
    if (!value) return '0';
    const num = Number(value) / 1e7;
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  // Calculate utilization percentage
  const utilizationPercent = utilizationRatio
    ? (utilizationRatio / 100).toFixed(1)
    : poolStats?.utilizationRate?.toFixed(1) || '0.0';

  // Calculate available liquidity
  const totalAssets = poolStats?.totalAssets || 0n;
  const borrowed = contractTotalBorrowed || poolStats?.totalBorrowed || 0n;
  const availableLiquidity = totalAssets > borrowed ? totalAssets - borrowed : 0n;

  const handlePauseToggle = async () => {
    // TODO: Call smart contract to pause/unpause
    console.log('Toggling pause state');
    setIsPaused(!isPaused);
  };

  const handleRevenueShareUpdate = async () => {
    // TODO: Call smart contract to update revenue share
    console.log('Updating revenue share to:', revenueShare);
  };

  const handleRefresh = async () => {
    await Promise.all([refreshPoolStats(), refetchStats()]);
  };

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <BackButton href="/admin" />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Liquidity Management</h1>
          <p className="text-gray-600 mt-1">Manage liquidity pool settings and monitor health</p>
        </div>

        <button
          onClick={handleRefresh}
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

      {/* Pool Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Pool Status</h3>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isPaused ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {isPaused ? 'Paused' : 'Active'}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Deposits</p>
              {isLoading ? (
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">${formatBigInt(totalAssets)}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Available Liquidity</p>
              {isLoading ? (
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">${formatBigInt(availableLiquidity)}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Utilization Rate</p>
              {isLoading ? (
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">{utilizationPercent}%</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">LP Token Metrics</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Supply</p>
              {isLoading ? (
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">
                  {formatLPTokens(totalSupply || poolStats?.totalShares)} LP
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Token Price</p>
              {isLoading ? (
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">
                  $
                  {totalSupply && totalAssets && totalSupply > 0n
                    ? (Number(totalAssets) / Number(totalSupply)).toFixed(4)
                    : '1.0000'}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Estimated Holders</p>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">{liquidityStats?.estimatedHolders || 0}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Stats</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">${liquidityStats?.totalRevenue || '0.00'}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">${liquidityStats?.revenueThisMonth || '0.00'}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending (from active loans)</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">${liquidityStats?.pendingRevenue || '0.00'}</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Metrics */}
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
              title="Currently Borrowed"
              value={formatBigInt(borrowed)}
              prefix="$"
              icon={DollarSign}
              description={`${liquidityStats?.activeLoanCount || 0} active loans`}
            />
            <MetricCard
              title="Total Repaid"
              value={liquidityStats?.totalRepaid || '0.00'}
              prefix="$"
              icon={TrendingUp}
              description={`${liquidityStats?.repaidLoanCount || 0} loans repaid`}
            />
            <MetricCard
              title="Pool APY"
              value={poolStats?.currentAPY?.toFixed(1) || '5.0'}
              suffix="%"
              icon={Droplets}
              description="Current annual yield"
            />
            <MetricCard
              title="LP Holders"
              value={liquidityStats?.estimatedHolders?.toString() || '0'}
              icon={Users}
              description="Unique depositors"
            />
          </>
        )}
      </div>

      {/* Emergency Controls */}
      <Card className="p-6 mb-8">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Emergency Controls</h2>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            Use these controls carefully. Pausing the pool will prevent all deposits, withdrawals,
            and borrowing.
          </p>
        </div>
        <Button
          onClick={handlePauseToggle}
          variant={isPaused ? 'default' : 'destructive'}
          className="flex items-center space-x-2"
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4" />
              <span>Resume Pool Operations</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              <span>Pause Pool Operations</span>
            </>
          )}
        </Button>
      </Card>

      {/* Revenue Settings */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Protocol Revenue Share (%)
            </label>
            <div className="flex space-x-2">
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={revenueShare}
                onChange={(e) => setRevenueShare(e.target.value)}
                className="w-32"
              />
              <Button onClick={handleRevenueShareUpdate}>Update</Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">Current: {revenueShare}% of loan fees</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Revenue Distribution
            </label>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>LP Holders</span>
                <span className="font-medium">70%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Protocol Treasury</span>
                <span className="font-medium">20%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Insurance Fund</span>
                <span className="font-medium">10%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
