'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pause, Play, Settings, TrendingUp, Droplets, AlertTriangle } from 'lucide-react';

export default function LiquidityManagement() {
  const [isPaused, setIsPaused] = useState(false);
  const [revenueShare, setRevenueShare] = useState('3');

  const handlePauseToggle = async () => {
    // TODO: Call smart contract to pause/unpause
    console.log('Toggling pause state');
    setIsPaused(!isPaused);
  };

  const handleRevenueShareUpdate = async () => {
    // TODO: Call smart contract to update revenue share
    console.log('Updating revenue share to:', revenueShare);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Liquidity Management</h1>
        <p className="text-gray-600 mt-1">Manage liquidity pool settings and monitor health</p>
      </div>

      {/* Pool Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Pool Status</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isPaused ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {isPaused ? 'Paused' : 'Active'}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Deposits</p>
              <p className="text-2xl font-bold">$1,234,567</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Available Liquidity</p>
              <p className="text-2xl font-bold">$417,456</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Utilization Rate</p>
              <p className="text-2xl font-bold">66.2%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">LP Token Metrics</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Supply</p>
              <p className="text-2xl font-bold">1,234,567 LP</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Token Price</p>
              <p className="text-2xl font-bold">$1.00</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Holders</p>
              <p className="text-2xl font-bold">156</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Stats</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold">$45,678</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold">$12,345</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Distribution</p>
              <p className="text-2xl font-bold">$2,345</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Emergency Controls */}
      <Card className="p-6 mb-8">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Emergency Controls</h2>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            Use these controls carefully. Pausing the pool will prevent all deposits, withdrawals, and borrowing.
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
              <Button onClick={handleRevenueShareUpdate}>
                Update
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Current: {revenueShare}% of merchant payments
            </p>
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