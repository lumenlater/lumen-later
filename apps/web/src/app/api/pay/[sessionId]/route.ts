import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutSession } from '@/lib/checkout/session';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/pay/[sessionId]
 * Get checkout session info for payment page (public - no auth required)
 * Only returns info needed for payment UI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Get session
    const session = await getCheckoutSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404 }
      );
    }

    // Get merchant info
    const merchant = await prisma.merchantApplication.findFirst({
      where: {
        applicantAddress: session.merchantId,
        status: 'APPROVED',
      },
    });

    // Check if session is still valid
    const isExpired = session.status === 'EXPIRED' || session.expiresAt < new Date();
    const isCompleted = session.status === 'COMPLETED';
    const isCancelled = session.status === 'CANCELLED';

    return NextResponse.json({
      id: session.id,
      status: isExpired ? 'expired' : session.status.toLowerCase(),
      amount: session.amount,
      description: session.description,
      merchant: {
        address: session.merchantId,
        name: merchant?.businessInfo?.tradingName || merchant?.businessInfo?.legalName || 'Unknown Merchant',
      },
      expires_at: session.expiresAt.toISOString(),
      // Redirect URLs for client
      success_url: session.successUrl,
      cancel_url: session.cancelUrl,
      // Bill ID (always include if available - needed for payment)
      bill_id: session.billId,
      // Completion info (only if completed)
      ...(isCompleted && {
        completed_at: session.completedAt?.toISOString(),
      }),
      // Flags for UI
      can_pay: session.status === 'PENDING' && !isExpired && !!session.billId,
      is_expired: isExpired,
      is_completed: isCompleted,
      is_cancelled: isCancelled,
    });
  } catch (error) {
    console.error('Error getting checkout session for payment:', error);
    return NextResponse.json(
      { error: 'Failed to get checkout session' },
      { status: 500 }
    );
  }
}
