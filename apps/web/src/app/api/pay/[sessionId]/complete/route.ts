import { NextRequest, NextResponse } from 'next/server';
import { completeCheckoutSession, getCheckoutSession } from '@/lib/checkout/session';
import { dispatchWebhook } from '@/lib/checkout/webhook';

/**
 * POST /api/pay/[sessionId]/complete
 * Complete a checkout session after successful payment
 * Called from the payment page after on-chain transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { billId, txHash, userAddress } = body;

    // Validate required fields
    if (!billId || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: billId, userAddress' },
        { status: 400 }
      );
    }

    // Get current session
    const session = await getCheckoutSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404 }
      );
    }

    // Check if session can be completed
    if (session.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot complete session with status: ${session.status}` },
        { status: 400 }
      );
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Checkout session has expired' },
        { status: 400 }
      );
    }

    // Complete the session
    const updatedSession = await completeCheckoutSession({
      sessionId,
      billId: billId.toString(),
      txHash: txHash || '',
      userAddress,
    });

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Failed to complete checkout session' },
        { status: 500 }
      );
    }

    // Dispatch webhook (fire and forget - don't block response)
    dispatchWebhook(updatedSession).catch((err) => {
      console.error('Webhook dispatch error:', err);
    });

    return NextResponse.json({
      success: true,
      session_id: updatedSession.id,
      bill_id: updatedSession.billId,
      status: updatedSession.status.toLowerCase(),
      completed_at: updatedSession.completedAt?.toISOString(),
    });
  } catch (error) {
    console.error('Error completing checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to complete checkout session' },
      { status: 500 }
    );
  }
}
