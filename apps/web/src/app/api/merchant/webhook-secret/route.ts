import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

const WEBHOOK_SECRET_PREFIX = 'whsec_';

/**
 * Generate a new webhook secret
 */
function generateWebhookSecret(): string {
  const secret = randomBytes(32).toString('base64url');
  return `${WEBHOOK_SECRET_PREFIX}${secret}`;
}

/**
 * POST /api/merchant/webhook-secret
 * Generate or regenerate webhook secret for a merchant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    // Validate required fields
    if (!address) {
      return NextResponse.json(
        { error: 'Missing required field: address' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!address.startsWith('G') || address.length !== 56) {
      return NextResponse.json(
        { error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    // Generate new webhook secret
    const webhookSecret = generateWebhookSecret();

    // Upsert merchant record
    await prisma.merchant.upsert({
      where: { address },
      update: { webhookSecret },
      create: {
        address,
        webhookSecret,
      },
    });

    return NextResponse.json({
      webhook_secret: webhookSecret,
      message: 'Webhook secret generated. Save this secret securely - it will not be shown again.',
    });
  } catch (error) {
    console.error('Error generating webhook secret:', error);
    return NextResponse.json(
      { error: 'Failed to generate webhook secret' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/merchant/webhook-secret
 * Check if merchant has a webhook secret configured (doesn't reveal the secret)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    // Validate required fields
    if (!address) {
      return NextResponse.json(
        { error: 'Missing required query param: address' },
        { status: 400 }
      );
    }

    // Get merchant record
    const merchant = await prisma.merchant.findUnique({
      where: { address },
      select: { webhookSecret: true },
    });

    return NextResponse.json({
      has_webhook_secret: !!merchant?.webhookSecret,
      // Show partial secret for verification (first 10 chars)
      secret_prefix: merchant?.webhookSecret?.slice(0, 15) + '...' || null,
    });
  } catch (error) {
    console.error('Error checking webhook secret:', error);
    return NextResponse.json(
      { error: 'Failed to check webhook secret' },
      { status: 500 }
    );
  }
}
