import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, isAuthError } from '@/lib/auth';
import { getCheckoutSession } from '@/lib/checkout/session';

/**
 * GET /api/checkout/sessions/[id]
 * Get checkout session status
 * Requires API key authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const { merchantId } = authResult;

    // Get session
    const session = await getCheckoutSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404 }
      );
    }

    // Verify merchant owns this session
    if (session.merchantId !== merchantId) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      amount: session.amount,
      order_id: session.orderId,
      description: session.description,
      status: session.status.toLowerCase(),
      expires_at: session.expiresAt.toISOString(),
      created_at: session.createdAt.toISOString(),
      // Only include completion info if completed
      ...(session.status === 'COMPLETED' && {
        bill_id: session.billId,
        tx_hash: session.txHash,
        user_address: session.userAddress,
        completed_at: session.completedAt?.toISOString(),
      }),
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Error getting checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to get checkout session' },
      { status: 500 }
    );
  }
}
