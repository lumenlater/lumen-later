'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, ExternalLink, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CONTRACT_IDS } from '../../../../../../packages/contract-ids';
import {
  ContractEvent,
  CONTRACT_COLORS,
  parseTopics,
  parseData,
  shortenAddress,
  getActionLabel,
} from '@/lib/event-parser';

interface EventsResponse {
  events: ContractEvent[];
  total: number;
  limit: number;
  offset: number;
}

interface StatsResponse {
  success: boolean;
  data: {
    totalEvents: number;
    eventsByContract: Record<string, number>;
    latestLedger: string | null;
    latestTimestamp: string | null;
  };
}

export default function AdminActivityPage() {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ['indexer-stats'],
    queryFn: async () => {
      const emptyResponse = { success: false, data: { totalEvents: 0, eventsByContract: {}, latestLedger: null, latestTimestamp: null } };
      try {
        const res = await fetch('/api/indexer/stats');
        if (!res.ok) return emptyResponse;
        const data = await res.json();
        return data || emptyResponse;
      } catch {
        return emptyResponse;
      }
    },
    refetchInterval: 10000,
  });

  const { data: eventsData, isLoading: eventsLoading, refetch } = useQuery<EventsResponse>({
    queryKey: ['indexer-events', selectedContract],
    queryFn: async () => {
      const emptyResponse = { events: [], total: 0, limit: 50, offset: 0 };
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (selectedContract) {
          params.set('contractId', selectedContract);
        }
        const res = await fetch(`/api/indexer/events?${params}`);
        if (!res.ok) return emptyResponse;
        const data = await res.json();
        return data?.events ? data : emptyResponse;
      } catch {
        return emptyResponse;
      }
    },
    refetchInterval: 10000,
  });

  const events = eventsData?.events || [];
  const total = eventsData?.total || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Protocol Activity
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time contract events indexed from Stellar testnet
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.data?.totalEvents || 0}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              BNPL Core
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-purple-600">
              {statsLoading ? '...' : stats?.data?.eventsByContract?.BNPL_CORE || 0}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              LP Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-blue-600">
              {statsLoading ? '...' : stats?.data?.eventsByContract?.LP_TOKEN || 0}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              USDC Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : stats?.data?.eventsByContract?.USDC_TOKEN || 0}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={selectedContract === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedContract(null)}
        >
          All
        </Button>
        <Button
          variant={selectedContract === CONTRACT_IDS.BNPL_CORE ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedContract(CONTRACT_IDS.BNPL_CORE)}
        >
          BNPL Core
        </Button>
        <Button
          variant={selectedContract === CONTRACT_IDS.LP_TOKEN ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedContract(CONTRACT_IDS.LP_TOKEN)}
        >
          LP Token
        </Button>
        <Button
          variant={selectedContract === CONTRACT_IDS.USDC_TOKEN ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedContract(CONTRACT_IDS.USDC_TOKEN)}
        >
          USDC Token
        </Button>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>
            Showing {events.length} of {total} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => {
                const { action, from, to } = parseTopics(event.topics);
                const data = parseData(event.data);

                return (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={CONTRACT_COLORS[event.contractName] || CONTRACT_COLORS.UNKNOWN}>
                          {event.contractName}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {getActionLabel(action)}
                        </Badge>
                        {event.transactionSuccessful ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        Ledger #{event.ledgerSequence}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {from && (
                        <div>
                          <span className="text-gray-500">From: </span>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {shortenAddress(from)}
                          </code>
                        </div>
                      )}
                      {to && (
                        <div>
                          <span className="text-gray-500">To: </span>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {shortenAddress(to)}
                          </code>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Data: </span>
                        {data.billId && (
                          <Badge variant="secondary" className="mr-2">Bill #{data.billId}</Badge>
                        )}
                        {data.amount && <span className="font-medium">{data.amount}</span>}
                        {data.amountPaid && <span className="font-medium text-green-600 ml-2">{data.amountPaid}</span>}
                        {data.shares && <span className="font-medium ml-2">{data.shares}</span>}
                        {data.expiration && <span className="text-gray-500 ml-2">(exp: {data.expiration})</span>}
                        {data.merchant && (
                          <span className="font-medium ml-2">
                            Merchant: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{shortenAddress(data.merchant)}</code>
                          </span>
                        )}
                        {data.user && !data.merchant && (
                          <span className="font-medium ml-2">
                            User: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{shortenAddress(data.user)}</code>
                          </span>
                        )}
                        {data.orderId && (
                          <span className="text-gray-500 ml-2">Order: {data.orderId.slice(0, 8)}...</span>
                        )}
                        {data.merchantInfoId && (
                          <span className="text-gray-500 ml-2">ID: {data.merchantInfoId.slice(0, 8)}...</span>
                        )}
                        {data.newStatus && (
                          <span className="font-medium">
                            {data.oldStatus && <span className="text-gray-500">{data.oldStatus} → </span>}
                            <Badge variant={data.newStatus === 'Approved' ? 'default' : 'destructive'} className="ml-1">
                              {data.newStatus}
                            </Badge>
                          </span>
                        )}
                        {data.raw && !data.amount && !data.merchant && !data.newStatus && !data.billId && <span className="text-gray-500">{data.raw}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-xs text-gray-500">
                        {new Date(event.ledgerClosedAt).toLocaleString()}
                      </span>
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${event.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View on Explorer
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No events found</p>
              <p className="text-sm text-gray-500 mt-2">
                Contract events will appear here as they occur
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
