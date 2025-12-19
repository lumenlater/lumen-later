'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
  CreditCard,
  ArrowLeft,
  Store,
} from 'lucide-react';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useBnplBill } from '@/hooks/web3/use-bnpl-bill';
import { replaceSessionIdPlaceholder } from '@/lib/checkout/session';

interface CheckoutSessionInfo {
  id: string;
  status: string;
  amount: number;
  description: string | null;
  merchant: {
    address: string;
    name: string;
  };
  expires_at: string;
  success_url: string;
  cancel_url: string;
  bill_id?: string;
  completed_at?: string;
  can_pay: boolean;
  is_expired: boolean;
  is_completed: boolean;
  is_cancelled: boolean;
}

export default function PayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { publicKey, isConnected, connect } = useWallet();
  const { payBill, isLoading: isPayingBill } = useBnplBill();

  const [session, setSession] = useState<CheckoutSessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Fetch session info
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/pay/${sessionId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load checkout session');
        }
        const data = await response.json();
        setSession(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load checkout session');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Handle payment
  const handlePay = async () => {
    if (!session || !publicKey) return;

    setIsPaying(true);
    try {
      // Create bill and pay with BNPL
      // Note: This creates a bill on-chain where the user is the borrower
      const billId = await payBill(sessionId);

      // Update session status via API
      await fetch(`/api/pay/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId,
          userAddress: publicKey,
        }),
      });

      toast({
        title: 'Payment Successful!',
        description: 'Your purchase has been completed with BNPL.',
      });

      // Redirect to success URL
      const successUrl = replaceSessionIdPlaceholder(session.success_url, sessionId);
      window.location.href = successUrl;
    } catch (err) {
      console.error('Payment error:', err);
      toast({
        title: 'Payment Failed',
        description: err instanceof Error ? err.message : 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setIsPaying(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (!session) return;
    const cancelUrl = replaceSessionIdPlaceholder(session.cancel_url, sessionId);
    window.location.href = cancelUrl;
  };

  // Format amount for display
  const formatAmount = (amount: number) => {
    // Amount is in stroops (7 decimals)
    return (amount / 1e7).toFixed(2);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary-500 mb-4" />
            <p className="text-gray-600">Loading checkout...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Checkout Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'This checkout session does not exist.'}</p>
            <Button variant="outline" onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired state
  if (session.is_expired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Session Expired</h2>
            <p className="text-gray-600 mb-6">
              This checkout session has expired. Please return to the merchant and start a new checkout.
            </p>
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Merchant
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed state
  if (session.is_completed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Complete</h2>
            <p className="text-gray-600 mb-6">
              This checkout has already been paid. You can return to the merchant.
            </p>
            <Button onClick={() => {
              const successUrl = replaceSessionIdPlaceholder(session.success_url, sessionId);
              window.location.href = successUrl;
            }}>
              Continue to Merchant
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cancelled state
  if (session.is_cancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Checkout Cancelled</h2>
            <p className="text-gray-600 mb-6">
              This checkout has been cancelled.
            </p>
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Merchant
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main payment UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Purchase</h1>
          <p className="text-gray-600 mt-1">Pay with LumenLater BNPL</p>
        </div>

        {/* Order Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Merchant */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Merchant</span>
              <span className="font-medium">{session.merchant.name}</span>
            </div>

            {/* Description */}
            {session.description && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Description</span>
                <span className="font-medium text-right max-w-[200px]">{session.description}</span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary-600">
                  ${formatAmount(session.amount)} USDC
                </span>
              </div>
            </div>

            {/* BNPL Terms */}
            <div className="bg-blue-50 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-blue-900 mb-2">BNPL Terms</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 14-day interest-free repayment period</li>
                <li>• No upfront payment required</li>
                <li>• Collateral required: 111% of purchase amount</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Payment Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment
            </CardTitle>
            <CardDescription>
              {isConnected
                ? `Connected: ${publicKey?.slice(0, 8)}...${publicKey?.slice(-8)}`
                : 'Connect your wallet to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <Button className="w-full" size="lg" onClick={connect}>
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePay}
                  disabled={isPaying || isPayingBill || !session.can_pay}
                >
                  {isPaying || isPayingBill ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay ${formatAmount(session.amount)} with BNPL
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCancel}
                  disabled={isPaying || isPayingBill}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session expiry notice */}
        <p className="text-center text-sm text-gray-500 mt-4">
          This checkout expires at {new Date(session.expires_at).toLocaleTimeString()}
        </p>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-400">
            Powered by LumenLater • Built on Stellar
          </p>
        </div>
      </div>
    </div>
  );
}
