'use client';

import { Header } from '@/components/layout/header';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useBillAPI } from '@/hooks/api/use-bill-api';
import { useUserInfo } from '@/hooks/web3/use-user-info';
import { useBnplBill } from '@/hooks/web3/use-bnpl-bill';
import { useBillEvents } from '@/hooks/web3/use-bill-events';
import { useUsdcToken } from '@/hooks/web3/use-usdc-token';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CreditCard, TrendingUp, DollarSign, Shield, Activity, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import CONTRACT_IDS from '@/config/contracts';
import { useQuery } from '@tanstack/react-query';
import {
  ContractEvent,
  CONTRACT_COLORS,
  parseTopics,
  parseData,
  shortenAddress,
  filterEvents,
  isOutgoingEvent,
} from '@/lib/event-parser';

interface EventsResponse {
  events: ContractEvent[];
  total: number;
  limit: number;
  offset: number;
}

export default function UserDashboard() {
  const { isConnected, publicKey } = useWallet();
  const router = useRouter();
  const { toast } = useToast();
  const { useBillsByUser } = useBillAPI();
  const { useBorrowingPower, useUserDebt } = useUserInfo();
  const { payBill, repayBill, getBill } = useBnplBill();
  const { useBillEventsByUser } = useBillEvents();
  const { getAllowance, approve } = useUsdcToken();
  
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [repayingBillId, setRepayingBillId] = useState<string | null>(null);
  const [billStatuses, setBillStatuses] = useState<Record<string, string>>({});
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  // Redirect to home if not connected (must be before any conditional returns)
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  const { data: offChainBills, isLoading: billsLoading } = useBillsByUser(publicKey);
  const { data: onChainBills, isLoading: onChainLoading } = useBillEventsByUser(publicKey);
  const { data: borrowingPower, isLoading: powerLoading } = useBorrowingPower(publicKey);
  const { data: debtInfo, isLoading: debtLoading } = useUserDebt(publicKey);

  // Fetch user's blockchain transactions
  const { data: userEvents, isLoading: eventsLoading } = useQuery<EventsResponse>({
    queryKey: ['user-events', publicKey],
    queryFn: async () => {
      const emptyResponse = { events: [], total: 0, limit: 20, offset: 0 };
      if (!publicKey) return emptyResponse;
      try {
        const params = new URLSearchParams({
          userAddress: publicKey,
          limit: '20'
        });
        const res = await fetch(`/api/indexer/events?${params}`);
        if (!res.ok) return emptyResponse;
        const data = await res.json();
        return data?.events ? data : emptyResponse;
      } catch {
        return emptyResponse;
      }
    },
    enabled: !!publicKey,
    refetchInterval: 30000,
  });

  // Combine on-chain and off-chain bills
  const bills = useMemo(() => {
    if (!offChainBills) return [];
    
    // Create a map of on-chain bills by order_id (which is MongoDB ID)
    const onChainMap = new Map(
      (onChainBills || []).map(bill => [bill.order_id, bill])
    );
    
    // Enhance off-chain bills with on-chain data
    const enhancedBills = offChainBills.map(offChainBill => {
      const onChainBill = onChainMap.get(offChainBill.id);
      return {
        ...offChainBill,
        onChainBillId: onChainBill?.bill_id,
        txHash: onChainBill?.txHash,
        onChainCreatedAt: onChainBill?.created_at,
      };
    });
    
    return enhancedBills;
  }, [offChainBills, onChainBills]);

  // Fetch bill statuses from blockchain
  useEffect(() => {
    if (!bills || bills.length === 0 || !getBill) return;

    const fetchBillStatuses = async () => {
      setLoadingStatuses(true);
      const statuses: Record<string, string> = {};

      for (const bill of bills) {
        if (bill.onChainBillId) {
          try {
            const billDetails = await getBill(bill.onChainBillId.toString());
            if (billDetails) {
              statuses[bill.onChainBillId] = billDetails.status.tag;
            }
          } catch (error) {
            console.error(`Error fetching status for bill ${bill.onChainBillId}:`, error);
          }
        }
      }

      setBillStatuses(statuses);
      setLoadingStatuses(false);
    };

    fetchBillStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills?.map(b => b.onChainBillId).join(',')]); // Only re-run when bill IDs change

  // Early return AFTER all hooks
  if (!isConnected) {
    return null;
  }

  const healthScore = borrowingPower?.overall_health_factor || 0;
  const healthPercentage = Math.min(100, Math.max(0, healthScore));
  const utilizationRate = borrowingPower?.max_borrowing ?
    (borrowingPower.current_borrowed / borrowingPower.max_borrowing) * 100 : 0;

  // Handle bill payment
  const handlePayBill = async (billId: string) => {
    if (!billId || !publicKey) return;
    
    setPayingBillId(billId);
    try {
      // First, check the bill status from blockchain
      const billDetails = await getBill(billId);
      
      if (!billDetails) {
        toast({
          title: 'Error',
          description: 'Bill not found on blockchain.',
          variant: 'destructive',
        });
        return;
      }

      // Check bill status
      if (billDetails.status.tag === 'Paid') {
        toast({
          title: 'Already Paid',
          description: 'This bill has already been paid with Lumen Later.',
          variant: 'destructive',
        });
        return;
      }

      if (billDetails.status.tag === 'Repaid') {
        toast({
          title: 'Already Repaid',
          description: 'This bill has already been repaid.',
          variant: 'destructive',
        });
        return;
      }

      if (billDetails.status.tag === 'Expired') {
        toast({
          title: 'Bill Expired',
          description: 'This bill has expired and cannot be paid.',
          variant: 'destructive',
        });
        return;
      }

      if (billDetails.status.tag === 'Liquidated') {
        toast({
          title: 'Bill Liquidated',
          description: 'This bill has been liquidated.',
          variant: 'destructive',
        });
        return;
      }

      // Only proceed if status is 'Created'
      if (billDetails.status.tag !== 'Created') {
        toast({
          title: 'Invalid Status',
          description: `Bill cannot be paid in status: ${billDetails.status.tag}`,
          variant: 'destructive',
        });
        return;
      }

      // Now proceed with payment
      await payBill(billId);
      toast({
        title: 'Success',
        description: 'Bill payment initiated successfully. Transaction will be confirmed shortly.',
      });
      
      router.refresh();
    } catch (error) {
      console.error('Error paying bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to pay bill. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPayingBillId(null);
    }
  };

  // Handle bill repayment
  const handleRepayBill = async (billId: string) => {
    if (!billId || !publicKey) return;
    
    setRepayingBillId(billId);
    try {
      // First, check the bill status from blockchain
      const billDetails = await getBill(billId);
      
      if (!billDetails) {
        toast({
          title: 'Error',
          description: 'Bill not found on blockchain.',
          variant: 'destructive',
        });
        return;
      }

      // Check bill status - only allow repay if status is 'Paid'
      if (billDetails.status.tag !== 'Paid') {
        toast({
          title: 'Cannot Repay',
          description: `Bill must be in 'Paid' status to repay. Current status: ${billDetails.status.tag}`,
          variant: 'destructive',
        });
        return;
      }

      // Check allowance for BNPL contract
      const allowance = await getAllowance(CONTRACT_IDS.BNPL_CORE);
      const repayAmount = billDetails.principal;

      // If allowance is insufficient, approve first
      if (allowance < repayAmount) {
        toast({
          title: 'Approving USDC',
          description: 'Approving USDC for repayment...',
        });
        
        // Approve a bit more than needed to avoid precision issues
        const approveAmount = repayAmount + BigInt(100);
        await approve(CONTRACT_IDS.BNPL_CORE, (Number(approveAmount) / 10 ** 7).toString());
        
        toast({
          title: 'USDC Approved',
          description: 'USDC approval successful. Processing repayment...',
        });
      }

      // Now proceed with repayment
      await repayBill(billId);
      toast({
        title: 'Success',
        description: 'Loan repayment initiated successfully. Transaction will be confirmed shortly.',
      });
      
      router.refresh();
    } catch (error) {
      console.error('Error repaying bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to repay loan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRepayingBillId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="outline" 
          onClick={() => router.push('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-8">My Dashboard</h1>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Available Credit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  ${borrowingPower?.available_borrowing.toFixed(2) || '0.00'}
                </span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                of ${borrowingPower?.max_borrowing.toFixed(2) || '0.00'} max
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Current Debt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  ${debtInfo?.total.toFixed(2) || '0.00'}
                </span>
                <DollarSign className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Principal: ${debtInfo?.principal.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                LP Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  ${borrowingPower?.lp_balance.toFixed(2) || '0.00'}
                </span>
                <Shield className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Collateral locked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {healthScore.toFixed(1)}%
                </span>
                <Activity className="h-4 w-4 text-purple-500" />
              </div>
              <Progress value={healthPercentage} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Credit Utilization Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Credit Utilization</CardTitle>
            <CardDescription>
              Your current borrowing status and available credit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Used Credit</span>
                  <span className="text-sm font-medium">
                    {utilizationRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={utilizationRate} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-sm text-gray-600">Current Borrowed</p>
                  <p className="text-lg font-semibold">
                    ${borrowingPower?.current_borrowed.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Required Collateral</p>
                  <p className="text-lg font-semibold">
                    ${borrowingPower?.required_collateral.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bills Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>
              Your pending and recent bills from merchants
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading bills...</p>
              </div>
            ) : bills && bills.length > 0 ? (
              <div className="space-y-4">
                {bills.map((bill) => (
                  <div key={bill.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{bill.merchantName}</h4>
                        <p className="text-sm text-gray-600">{bill.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${bill.amount.toFixed(2)}</p>
                        {bill.onChainBillId && (
                          <Badge variant="outline" className="text-xs">
                            #{bill.onChainBillId}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Created {new Date(bill.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        {bill.onChainBillId ? (
                          <>
                            {(() => {
                              const status = billStatuses[bill.onChainBillId];
                              
                              // If we don't have status yet or status is loading, show the pay button
                              if (!status || status === 'Created') {
                                return (
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => handlePayBill(bill.onChainBillId!.toString())}
                                    disabled={payingBillId === bill.onChainBillId!.toString()}
                                  >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    {payingBillId === bill.onChainBillId!.toString() ? 'Processing...' : 'Pay with Lumen Later'}
                                  </Button>
                                );
                              }
                              
                              switch (status) {
                                case 'Paid':
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="default" className="text-xs bg-blue-500">
                                        Paid with Lumen Later
                                      </Badge>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleRepayBill(bill.onChainBillId!.toString())}
                                        disabled={repayingBillId === bill.onChainBillId!.toString()}
                                      >
                                        {repayingBillId === bill.onChainBillId!.toString() ? 'Repaying...' : 'Repay Loan'}
                                      </Button>
                                    </div>
                                  );
                                case 'Repaid':
                                  return (
                                    <Badge variant="default" className="text-xs bg-green-500">
                                      Fully Repaid
                                    </Badge>
                                  );
                                case 'Expired':
                                  return (
                                    <Badge variant="destructive" className="text-xs">
                                      Expired
                                    </Badge>
                                  );
                                case 'Overdue':
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="destructive" className="text-xs">
                                        Overdue
                                      </Badge>
                                      <Button 
                                        variant="destructive" 
                                        size="sm"
                                        disabled
                                      >
                                        Repay Now
                                      </Button>
                                    </div>
                                  );
                                case 'Liquidated':
                                  return (
                                    <Badge variant="destructive" className="text-xs bg-red-700">
                                      Liquidated
                                    </Badge>
                                  );
                                default:
                                  return (
                                    <Badge variant="secondary" className="text-xs">
                                      {status}
                                    </Badge>
                                  );
                              }
                            })()}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Pending
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Waiting for blockchain confirmation
                            </span>
                          </div>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No bills found</p>
                <p className="text-sm text-gray-500 mt-2">
                  When merchants create bills for you, they'll appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Your recent blockchain transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading transactions...</p>
              </div>
            ) : userEvents?.events?.length > 0 ? (
              <div className="space-y-3">
                {filterEvents(userEvents.events).map((event) => {
                  const { action, from, to } = parseTopics(event.topics);
                  const data = parseData(event.data);
                  const isOutgoing = isOutgoingEvent(event, publicKey);
                  const isLpEvent = event.contractName === 'LP_TOKEN';

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
                            {action}
                          </Badge>
                          {!isLpEvent && (
                            <Badge
                              variant="outline"
                              className={isOutgoing ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}
                            >
                              {isOutgoing ? 'Sent' : 'Received'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          {data.amount && <span className="font-medium block">{data.amount}</span>}
                          {data.shares && <span className="text-sm text-gray-500 block">{data.shares}</span>}
                          {data.raw && !data.amount && <span className="text-sm text-gray-500">{data.raw}</span>}
                        </div>
                      </div>

                      {!isLpEvent && (
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {from && from !== publicKey && (
                            <div>
                              <span className="text-gray-500">From: </span>
                              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                {shortenAddress(from)}
                              </code>
                            </div>
                          )}
                          {to && to !== publicKey && (
                            <div>
                              <span className="text-gray-500">To: </span>
                              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                {shortenAddress(to)}
                              </code>
                            </div>
                          )}
                        </div>
                      )}

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
                <p className="text-gray-600">No transactions found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Your blockchain transactions will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}