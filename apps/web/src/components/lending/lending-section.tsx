'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useUsdcToken } from '@/hooks/web3/use-usdc-token';
import { useLiquidityPool } from '@/hooks/web3/use-liquidity-pool';
import { formatAmount } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import CONTRACT_IDS from '@/config/contracts';
import { Config } from '@/constants/config';
import { APYHistoryChart } from '@/components/charts/APYHistoryChart';

export function LendingSection() {
  const { isConnected } = useWallet();
  const { toast } = useToast();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  // Use React Query hooks for automatic caching and deduplication
  const { 
    balance: usdcBalance, 
    approve: approveUSDC, 
    getAllowance: checkAllowance,
    isLoading: usdcLoading
  } = useUsdcToken();
  
  const {
    poolStats,
    deposit,
    withdraw,
    calculateAPY,
    balance: lpBalance,       // USDC value (withdrawable amount)
    rawShares,                // LP token count (doesn't change)
    balanceInUSDC,
    lockedBalance,
    availableBalance,
    totalRawShares,           // Total LP shares in pool
    canWithdraw: canWithdrawAmount,
    isLoading: poolLoading
  } = useLiquidityPool();
  
  // LP loading state is the same as pool loading state
  const lpLoading = poolLoading;

  // Check if the user has approved USDC spending (with debounce)
  useEffect(() => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setIsApproved(false);
      return;
    }
    
    if (!isConnected) return;
    
    // Debounce the check to avoid too many requests
    const timeoutId = setTimeout(async () => {
      setIsCheckingApproval(true);
      try {
        const allowance = await checkAllowance(CONTRACT_IDS.LP_TOKEN);
        const amountInStroops = BigInt(Math.floor(parseFloat(depositAmount) * 10 ** Config.USDC_DECIMALS));
        setIsApproved(allowance >= amountInStroops);
      } catch (err) {
        console.error('Failed to check allowance:', err);
        setIsApproved(false);
      } finally {
        setIsCheckingApproval(false);
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [depositAmount, isConnected, checkAllowance]);

  const handleApprove = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    setIsDepositLoading(true);
    try {
      await approveUSDC(CONTRACT_IDS.LP_TOKEN, depositAmount);
      toast({
        title: 'Approval Successful',
        description: `Approved ${depositAmount} USDC for deposit.`,
      });
      
      // Re-check approval status
      const allowance = await checkAllowance(CONTRACT_IDS.LP_TOKEN);
      const amountInStroops = BigInt(Math.floor(parseFloat(depositAmount) * 10 ** Config.USDC_DECIMALS));
      setIsApproved(allowance >= amountInStroops);
    } catch (error) {
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDepositLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    setIsDepositLoading(true);
    try {
      const lpTokens = await deposit(depositAmount);
      toast({
        title: 'Deposit Successful',
        description: `Deposited ${depositAmount} USDC and received ${formatAmount(lpTokens)} LP shares.`,
      });
      setDepositAmount('');
      setIsApproved(false);
      
      // React Query will automatically refresh relevant data after mutations
    } catch (error) {
      toast({
        title: 'Deposit Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;

    setIsWithdrawLoading(true);
    try {
      const usdcAmount = await withdraw(withdrawAmount);
      toast({
        title: 'Withdrawal Successful',
        description: `Burned ${withdrawAmount} LP shares and received ${formatAmount(usdcAmount)} USDC.`,
      });
      setWithdrawAmount('');
      
      // React Query will automatically refresh relevant data after mutations
    } catch (error) {
      toast({
        title: 'Withdrawal Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Deposit USDC</CardTitle>
            <CardDescription>
              Earn yield by providing liquidity to the Lumen Later pool
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount (USDC)
                <span className="text-xs text-muted-foreground ml-2">
                  Balance: {usdcBalance || '0.00'} USDC
                </span>
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                disabled={!isConnected || isDepositLoading}
              />
            </div>
            <Button 
              className="w-full" 
              disabled={!isConnected || depositAmount === '' || isDepositLoading || isCheckingApproval}
              onClick={isApproved ? handleDeposit : handleApprove}
            >
              {isDepositLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isApproved ? 'Depositing...' : 'Approving...'}
                </>
              ) : isCheckingApproval ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking approval...
                </>
              ) : isApproved ? (
                'Deposit USDC'
              ) : (
                'Approve USDC'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Withdraw</CardTitle>
            <CardDescription>
              Withdraw your deposits and earned interest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                LP Tokens to Withdraw
                <span className="text-xs text-muted-foreground ml-2">
                  Your shares: {rawShares ? formatAmount(rawShares) : '0.00'} (≈${lpBalance ? formatAmount(lpBalance) : '0.00'})
                </span>
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={!isConnected || isWithdrawLoading}
              />
              {lockedBalance && lockedBalance > 0n && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ {formatAmount(lockedBalance)} LP tokens are locked as collateral for your loans
                </p>
              )}
            </div>
            <Button 
              className="w-full" 
              variant="outline"
              disabled={
                !isConnected || 
                withdrawAmount === '' || 
                isWithdrawLoading ||
                (withdrawAmount !== '' && !canWithdrawAmount(withdrawAmount))
              }
              onClick={handleWithdraw}
            >
              {isWithdrawLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : withdrawAmount && !canWithdrawAmount(withdrawAmount) ? (
                'Insufficient Available Balance'
              ) : (
                'Withdraw'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your LP Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {lpLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                rawShares ? formatAmount(rawShares) : '0.00'
              )}
            </p>
            {lockedBalance && lockedBalance > 0n && (
              <p className="text-xs text-amber-600 mt-1">
                {formatAmount(lockedBalance)} locked
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Value (USDC)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {lpLoading || poolLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                lpBalance ? `$${formatAmount(lpBalance)}` : '$0.00'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pool APY</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {poolLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `${calculateAPY().toFixed(2)}%`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {poolLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `${poolStats?.utilizationRate || 0}%`
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Pool Information */}
      <Card>
        <CardHeader>
          <CardTitle>Pool Information</CardTitle>
          <CardDescription>
            Current liquidity pool statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pool Size</p>
              <p className="text-lg font-semibold">
                {poolLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  poolStats ? `$${formatAmount(poolStats.totalAssets)}` : '$0.00'
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Liquidity</p>
              <p className="text-lg font-semibold">
                {poolLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  poolStats ? `$${formatAmount(poolStats.availableLiquidity)}` : '$0.00'
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Borrowed</p>
              <p className="text-lg font-semibold">
                {poolLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  poolStats ? `$${formatAmount(poolStats.totalBorrowed)}` : '$0.00'
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total LP Shares</p>
              <p className="text-lg font-semibold">
                {poolLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  totalRawShares ? formatAmount(totalRawShares) : '0.00'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* APY History Chart */}
      <APYHistoryChart period="7d" showTVL={true} height={300} />
    </div>
  );
}