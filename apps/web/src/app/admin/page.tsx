'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { TrendingUp, TrendingDown, Users, DollarSign, AlertCircle, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  prefix?: string;
}

function MetricCard({ title, value, change, icon: Icon, prefix = '' }: MetricCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {prefix}{value}
          </p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-primary-100 rounded-lg">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState({
    tvl: '0',
    activeLoans: 0,
    totalRevenue: '0',
    utilizationRate: 0,
  });

  // TODO: Fetch real metrics from contracts
  useEffect(() => {
    // Simulated data for now
    setMetrics({
      tvl: '1,234,567',
      activeLoans: 42,
      totalRevenue: '45,678',
      utilizationRate: 67.5,
    });
  }, []);

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <BackButton href="/" />
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your Lumen Later protocol</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Value Locked"
          value={metrics.tvl}
          prefix="$"
          change={12.5}
          icon={DollarSign}
        />
        <MetricCard
          title="Active Loans"
          value={metrics.activeLoans.toString()}
          change={8.3}
          icon={Users}
        />
        <MetricCard
          title="Total Revenue"
          value={metrics.totalRevenue}
          prefix="$"
          change={15.2}
          icon={TrendingUp}
        />
        <MetricCard
          title="Utilization Rate"
          value={`${metrics.utilizationRate}%`}
          change={-2.1}
          icon={Activity}
        />
      </div>

      {/* Quick Actions */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <AlertCircle className="w-5 h-5 text-yellow-600 mb-2" />
            <p className="font-medium">Review Overdue Loans</p>
            <p className="text-sm text-gray-600 mt-1">3 loans need attention</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <DollarSign className="w-5 h-5 text-green-600 mb-2" />
            <p className="font-medium">Process Liquidations</p>
            <p className="text-sm text-gray-600 mt-1">2 loans eligible</p>
          </button>
          <button 
            onClick={() => router.push('/admin/merchants')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-5 h-5 text-blue-600 mb-2" />
            <p className="font-medium">New Merchant Requests</p>
            <p className="text-sm text-gray-600 mt-1">5 pending approval</p>
          </button>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">New loan created</p>
              <p className="text-sm text-gray-600">User GXXX...XXXX borrowed 1,000 USDC</p>
            </div>
            <span className="text-sm text-gray-500">2 minutes ago</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">Loan repayment</p>
              <p className="text-sm text-gray-600">User GYYY...YYYY repaid 500 USDC</p>
            </div>
            <span className="text-sm text-gray-500">15 minutes ago</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Liquidity added</p>
              <p className="text-sm text-gray-600">User GZZZ...ZZZZ deposited 10,000 USDC</p>
            </div>
            <span className="text-sm text-gray-500">1 hour ago</span>
          </div>
        </div>
      </Card>
    </div>
  );
}