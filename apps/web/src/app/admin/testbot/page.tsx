'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  Play,
  Pause,
  RefreshCw,
  Activity,
  Users,
  Store,
  DollarSign,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BotState {
  isRunning: boolean;
  startedAt?: string;
  dailyStats: {
    date: string;
    txCount: number;
    successCount: number;
    failureCount: number;
    volume: number;
    scenarios: Record<string, number>;
  };
  totalVolume: number;
  goals: {
    tvl: { current: number; target: number; percentage: number };
    merchants: { current: number; target: number; percentage: number };
    users: { current: number; target: number; percentage: number };
    dailyTx: { current: number; target: number; percentage: number };
  };
  recentActivity: Array<{
    timestamp: string;
    scenario: string;
    success: boolean;
    details?: Record<string, any>;
    error?: string;
    volume?: number;
  }>;
}

interface BotStatusResponse {
  success: boolean;
  data: BotState;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function getScenarioColor(scenario: string): string {
  const colors: Record<string, string> = {
    'bootstrap': 'bg-purple-100 text-purple-700',
    'lp-deposit': 'bg-blue-100 text-blue-700',
    'lp-withdraw': 'bg-cyan-100 text-cyan-700',
    'bnpl-create-bill': 'bg-green-100 text-green-700',
    'bnpl-pay': 'bg-yellow-100 text-yellow-700',
    'bnpl-repay': 'bg-orange-100 text-orange-700',
    'bnpl-cycle': 'bg-indigo-100 text-indigo-700',
  };
  return colors[scenario] || 'bg-gray-100 text-gray-700';
}

function getScenarioLabel(scenario: string): string {
  const labels: Record<string, string> = {
    'bootstrap': 'Bootstrap',
    'lp-deposit': 'LP Deposit',
    'lp-withdraw': 'LP Withdraw',
    'bnpl-create-bill': 'Create Bill',
    'bnpl-pay': 'Pay Bill',
    'bnpl-repay': 'Repay Bill',
    'bnpl-cycle': 'BNPL Cycle',
  };
  return labels[scenario] || scenario;
}

export default function AdminTestbotPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<BotStatusResponse>({
    queryKey: ['testbot-status'],
    queryFn: async () => {
      const res = await fetch('/api/testbot/status');
      if (!res.ok) throw new Error('Failed to fetch bot status');
      return res.json();
    },
    refetchInterval: 5000,
  });

  const controlMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop' | 'pause' | 'resume') => {
      const res = await fetch('/api/testbot/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Failed to control bot');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testbot-status'] });
    },
  });

  const botState = data?.data;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Testnet Bot
          </h1>
          <p className="text-gray-600 mt-1">
            Automated transaction generator for testing the protocol
          </p>
        </div>
        <div className="flex items-center gap-3">
          {botState?.isRunning ? (
            <Button
              variant="outline"
              onClick={() => controlMutation.mutate('pause')}
              disabled={controlMutation.isPending}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button
              onClick={() => controlMutation.mutate('start')}
              disabled={controlMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['testbot-status'] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading bot status...</p>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-600">Failed to load bot status</p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure the bot API is configured and the bot is running
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status Card */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${botState?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <div>
                    <span className="font-medium">
                      {botState?.isRunning ? 'Running' : 'Stopped'}
                    </span>
                    {botState?.startedAt && (
                      <span className="text-sm text-gray-500 ml-2">
                        Started {formatRelativeTime(botState.startedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={botState?.isRunning ? 'default' : 'secondary'}>
                  {botState?.isRunning ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Goal Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  TVL Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${botState?.goals.tvl.current.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  of ${botState?.goals.tvl.target.toLocaleString() || 0} target
                </div>
                <Progress value={botState?.goals.tvl.percentage || 0} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Merchants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {botState?.goals.merchants.current || 0}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  of {botState?.goals.merchants.target || 0} target
                </div>
                <Progress value={botState?.goals.merchants.percentage || 0} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {botState?.goals.users.current || 0}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  of {botState?.goals.users.target || 0} target
                </div>
                <Progress value={botState?.goals.users.percentage || 0} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Daily Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {botState?.goals.dailyTx.current || 0}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  of {botState?.goals.dailyTx.target || 0} target
                </div>
                <Progress value={botState?.goals.dailyTx.percentage || 0} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Volume Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Daily Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${(botState?.dailyStats.volume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-500">
                  USDC transacted today
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Total Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${(botState?.totalVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-500">
                  USDC transacted all time
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Today's Activity
                </CardTitle>
                <CardDescription>
                  {botState?.dailyStats.date || 'No data'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{botState?.dailyStats.txCount || 0}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {botState?.dailyStats.successCount || 0}
                    </div>
                    <div className="text-sm text-gray-500">Success</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {botState?.dailyStats.failureCount || 0}
                    </div>
                    <div className="text-sm text-gray-500">Failed</div>
                  </div>
                </div>

                {botState?.dailyStats.scenarios && Object.keys(botState.dailyStats.scenarios).length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">By Scenario</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(botState.dailyStats.scenarios).map(([scenario, count]) => (
                        <Badge key={scenario} variant="secondary" className={getScenarioColor(scenario)}>
                          {getScenarioLabel(scenario)}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Last 10 transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {botState?.recentActivity && botState.recentActivity.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {botState.recentActivity.slice(0, 10).map((activity, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          {activity.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Badge variant="outline" className={getScenarioColor(activity.scenario)}>
                            {getScenarioLabel(activity.scenario)}
                          </Badge>
                          {activity.volume && activity.volume > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              ${activity.volume.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No recent activity
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manually trigger specific scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" disabled>
                  Run Bootstrap
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Trigger LP Deposit
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Trigger BNPL Cycle
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                * Quick actions require the bot to be connected locally via PM2
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
