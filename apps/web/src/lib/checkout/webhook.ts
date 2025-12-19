import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';
import { CheckoutSessionData } from './session';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [60, 300, 900]; // seconds: 1min, 5min, 15min

export interface WebhookPayload {
  id: string;
  type: 'checkout.session.completed';
  created: number;
  data: {
    session_id: string;
    bill_id: string | null;
    amount: number;
    order_id: string | null;
    tx_hash: string | null;
    user_address: string | null;
    metadata: Record<string, unknown> | null;
  };
}

/**
 * Generate webhook signature
 * Format: t={timestamp},v1={hmac}
 */
export function generateWebhookSignature(
  payload: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${hmac}`;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  maxAgeSeconds = 300
): { valid: boolean; error?: string } {
  // Parse signature
  const parts = signature.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signaturePart = parts.find((p) => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return { valid: false, error: 'Invalid signature format' };
  }

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const expectedSignature = signaturePart.slice(3);

  if (isNaN(timestamp)) {
    return { valid: false, error: 'Invalid timestamp' };
  }

  // Check timestamp age
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > maxAgeSeconds) {
    return { valid: false, error: 'Signature expired' };
  }

  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  if (computedSignature !== expectedSignature) {
    return { valid: false, error: 'Signature mismatch' };
  }

  return { valid: true };
}

/**
 * Create webhook payload from session
 */
export function createWebhookPayload(session: CheckoutSessionData): WebhookPayload {
  return {
    id: `evt_${session.id}`,
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      session_id: session.id,
      bill_id: session.billId,
      amount: session.amount,
      order_id: session.orderId,
      tx_hash: session.txHash,
      user_address: session.userAddress,
      metadata: session.metadata,
    },
  };
}

/**
 * Dispatch webhook for completed session
 */
export async function dispatchWebhook(
  session: CheckoutSessionData
): Promise<void> {
  if (!session.webhookUrl) {
    return; // No webhook URL configured
  }

  const payload = createWebhookPayload(session);
  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateWebhookSignature(payloadString, timestamp);

  // Create delivery record
  const delivery = await prisma.webhookDelivery.create({
    data: {
      sessionId: session.id,
      webhookUrl: session.webhookUrl,
      payload: payload,
      signature,
      status: 'PENDING',
    },
  });

  // Attempt delivery
  await attemptWebhookDelivery(delivery.id);
}

/**
 * Attempt to deliver a webhook
 */
async function attemptWebhookDelivery(deliveryId: string): Promise<boolean> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery || delivery.status === 'DELIVERED') {
    return false;
  }

  const payload = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateWebhookSignature(payload, timestamp);

  try {
    const response = await fetch(delivery.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LumenLater-Signature': signature,
      },
      body: payload,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const responseBody = await response.text().catch(() => '');

    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: response.ok ? 'DELIVERED' : 'PENDING',
        attempts: delivery.attempts + 1,
        lastAttemptAt: new Date(),
        responseCode: response.status,
        responseBody: responseBody.slice(0, 1000), // Limit stored response
        ...(response.ok
          ? {}
          : {
              nextRetryAt: getNextRetryTime(delivery.attempts + 1),
            }),
      },
    });

    return response.ok;
  } catch (error) {
    // Network error or timeout
    const nextRetry = getNextRetryTime(delivery.attempts + 1);

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: delivery.attempts + 1 >= MAX_RETRY_ATTEMPTS ? 'FAILED' : 'PENDING',
        attempts: delivery.attempts + 1,
        lastAttemptAt: new Date(),
        responseBody: error instanceof Error ? error.message : 'Unknown error',
        nextRetryAt: nextRetry,
      },
    });

    return false;
  }
}

/**
 * Calculate next retry time based on attempt count
 */
function getNextRetryTime(attemptCount: number): Date | null {
  if (attemptCount >= MAX_RETRY_ATTEMPTS) {
    return null;
  }

  const delaySeconds = RETRY_DELAYS[attemptCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
  const nextRetry = new Date();
  nextRetry.setSeconds(nextRetry.getSeconds() + delaySeconds);
  return nextRetry;
}

/**
 * Process pending webhook retries (call from cron job)
 */
export async function processWebhookRetries(): Promise<number> {
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: 'PENDING',
      nextRetryAt: {
        lte: new Date(),
      },
      attempts: {
        lt: MAX_RETRY_ATTEMPTS,
      },
    },
    take: 10, // Process 10 at a time
  });

  let successCount = 0;
  for (const delivery of pendingDeliveries) {
    const success = await attemptWebhookDelivery(delivery.id);
    if (success) successCount++;
  }

  return successCount;
}
