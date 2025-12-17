'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProtocolStats, ProtocolSnapshot, formatStroops } from '@/hooks/api/use-protocol-stats';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';

interface APYHistoryChartProps {
  period?: '24h' | '7d' | '30d' | '90d' | 'all';
  showTVL?: boolean;
  height?: number;
}

interface ChartDataPoint {
  time: string;
  date: Date;
  apyDaily: number;
  apyMonthly: number | null;
  tvl: number;
  utilization: number | null;
}

// Format date for display
const formatDate = (date: Date, period: string): string => {
  if (period === '24h') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (period === '7d') {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('APY')
              ? `${entry.value?.toFixed(2)}%`
              : entry.name.includes('TVL')
              ? `$${entry.value?.toLocaleString()}`
              : `${entry.value?.toFixed(1)}%`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function APYHistoryChart({
  period = '7d',
  showTVL = true,
  height = 300
}: APYHistoryChartProps) {
  const { history, isLoading, isError } = useProtocolStats({
    includeHistory: true,
    period,
    refetchInterval: 5 * 60 * 1000, // 5 minutes for history
  });

  // Transform history data for chart
  const chartData: ChartDataPoint[] = (history || [])
    .map((snapshot: ProtocolSnapshot) => ({
      time: formatDate(new Date(snapshot.createdAt), period),
      date: new Date(snapshot.createdAt),
      apyDaily: snapshot.poolApyDaily ?? 0,
      apyMonthly: snapshot.poolApyMonthly,
      tvl: snapshot.poolTvl ? Number(snapshot.poolTvl) / 1e7 : 0,
      utilization: snapshot.poolUtilization,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate average APY
  const avgAPY = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.apyDaily, 0) / chartData.length
    : 0;

  // Get current APY
  const currentAPY = chartData.length > 0 ? chartData[chartData.length - 1].apyDaily : 0;

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">APY History</CardTitle>
          <CardDescription>Unable to load historical data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pool APY History</CardTitle>
            <CardDescription>
              {period === '24h' ? 'Last 24 hours' :
               period === '7d' ? 'Last 7 days' :
               period === '30d' ? 'Last 30 days' :
               period === '90d' ? 'Last 90 days' : 'All time'}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `${currentAPY.toFixed(2)}%`
              )}
            </p>
            <p className="text-xs text-gray-500">
              Avg: {avgAPY.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center text-gray-500" style={{ height }}>
            <p>No historical data available yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis
                yAxisId="apy"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(value) => `${value}%`}
                domain={['auto', 'auto']}
              />
              {showTVL && (
                <YAxis
                  yAxisId="tvl"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  domain={['auto', 'auto']}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* APY Line */}
              <Line
                yAxisId="apy"
                type="monotone"
                dataKey="apyDaily"
                name="Daily APY"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              {/* TVL Area (optional) */}
              {showTVL && (
                <Area
                  yAxisId="tvl"
                  type="monotone"
                  dataKey="tvl"
                  name="TVL"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  stroke="#3b82f6"
                  strokeWidth={1}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard cards
export function APYSparkline({ height = 60 }: { height?: number }) {
  const { history, isLoading } = useProtocolStats({
    includeHistory: true,
    period: '7d',
    refetchInterval: 5 * 60 * 1000,
  });

  const chartData = (history || [])
    .map((snapshot: ProtocolSnapshot) => ({
      apy: snapshot.poolApyDaily ?? 0,
    }))
    .slice(-24); // Last 24 data points

  if (isLoading || chartData.length === 0) {
    return <div style={{ height }} className="bg-gray-100 animate-pulse rounded" />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="apy"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
