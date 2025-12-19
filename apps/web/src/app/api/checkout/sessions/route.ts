import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateApiKey, isAuthError } from '@/lib/auth';
import {
  createCheckoutSession,
  getCheckoutUrl,
} from '@/lib/checkout/session';

// Request validation schema
const createSessionSchema = z.object({
  bill_id: z.string().min(1, 'Bill ID is required'),
  amount: z.number().positive('Amount must be positive'),
  order_id: z.string().optional(),
  description: z.string().optional(),
  success_url: z.string().url('Invalid success URL'),
  cancel_url: z.string().url('Invalid cancel URL'),
  webhook_url: z.string().url('Invalid webhook URL').optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/checkout/sessions
 * Create a new checkout session
 * Requires API key authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const { merchantId } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validation = createSessionSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues || validation.error.errors || [];
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: errors.map((e: { path: (string | number)[]; message: string }) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const {
      bill_id,
      amount,
      order_id,
      description,
      success_url,
      cancel_url,
      webhook_url,
      metadata,
    } = validation.data;

    // Create checkout session
    const session = await createCheckoutSession({
      merchantId,
      billId: bill_id,
      amount,
      orderId: order_id,
      description,
      successUrl: success_url,
      cancelUrl: cancel_url,
      webhookUrl: webhook_url,
      metadata,
    });

    return NextResponse.json({
      id: session.id,
      checkout_url: getCheckoutUrl(session.id),
      bill_id: session.billId,
      amount: session.amount,
      order_id: session.orderId,
      status: session.status.toLowerCase(),
      expires_at: session.expiresAt.toISOString(),
      created_at: session.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
