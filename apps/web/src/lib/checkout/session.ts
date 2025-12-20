import { prisma } from '@/lib/prisma';
import { CheckoutSessionStatus } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import CONTRACT_IDS from '@/config/contracts';

const SESSION_EXPIRY_HOURS = 1;
const SESSION_ID_PREFIX = 'cs_';

export interface CreateSessionParams {
  merchantId: string;
  /** On-chain bill ID created by merchant */
  billId: string;
  amount: number;
  orderId?: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionData {
  id: string;
  merchantId: string;
  amount: number;
  orderId: string | null;
  description: string | null;
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string | null;
  metadata: Record<string, unknown> | null;
  status: CheckoutSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  billId: string | null;
  txHash: string | null;
  completedAt: Date | null;
  userAddress: string | null;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `${SESSION_ID_PREFIX}${createId()}`;
}

/**
 * Create a new checkout session
 */
export async function createCheckoutSession(
  params: CreateSessionParams
): Promise<CheckoutSessionData> {
  const {
    merchantId,
    billId,
    amount,
    orderId,
    description,
    successUrl,
    cancelUrl,
    webhookUrl,
    metadata,
  } = params;

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

  const session = await prisma.checkoutSession.create({
    data: {
      id: generateSessionId(),
      merchantId,
      billId,
      amount,
      orderId,
      description,
      successUrl,
      cancelUrl,
      webhookUrl,
      metadata: metadata ? (metadata as object) : undefined,
      expiresAt,
    },
  });

  return transformSession(session);
}

/**
 * Get a checkout session by ID
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<CheckoutSessionData | null> {
  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;

  // Check if expired and update status if needed
  if (
    session.status === 'PENDING' &&
    session.expiresAt < new Date()
  ) {
    const updated = await prisma.checkoutSession.update({
      where: { id: sessionId },
      data: { status: 'EXPIRED' },
    });
    return transformSession(updated);
  }

  return transformSession(session);
}

/**
 * Complete a checkout session after successful payment
 */
export async function completeCheckoutSession(params: {
  sessionId: string;
  billId: string;
  txHash: string;
  userAddress: string;
}): Promise<CheckoutSessionData | null> {
  const { sessionId, billId, txHash, userAddress } = params;

  try {
    // Get the session first to access all data
    const existingSession = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!existingSession || existingSession.status !== 'PENDING') {
      return null;
    }

    // Get merchant info for the bill
    const merchant = await prisma.merchantApplication.findFirst({
      where: {
        applicantAddress: existingSession.merchantId,
        status: 'APPROVED',
      },
    });

    const merchantName = merchant?.businessInfo?.tradingName ||
                         merchant?.businessInfo?.legalName ||
                         'Merchant';

    // Use transaction to update session and create bill atomically
    const [session] = await prisma.$transaction([
      // Update checkout session
      prisma.checkoutSession.update({
        where: {
          id: sessionId,
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
          billId,
          txHash,
          userAddress,
          completedAt: new Date(),
        },
      }),
      // Create off-chain bill for user's dashboard
      prisma.bill.create({
        data: {
          contractId: CONTRACT_IDS.BNPL_CORE,
          merchantAddress: existingSession.merchantId,
          userAddress,
          amount: existingSession.amount,
          description: existingSession.description || `Order ${existingSession.orderId || sessionId}`,
          merchantName,
          onChainBillId: parseInt(billId, 10),
        },
      }),
    ]);

    return transformSession(session);
  } catch (error) {
    console.error('Error completing checkout session:', error);
    // Session not found or not in PENDING status
    return null;
  }
}

/**
 * Cancel a checkout session
 */
export async function cancelCheckoutSession(
  sessionId: string
): Promise<CheckoutSessionData | null> {
  try {
    const session = await prisma.checkoutSession.update({
      where: {
        id: sessionId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    return transformSession(session);
  } catch {
    return null;
  }
}

/**
 * Validate session URL parameter replacement
 * Replaces {SESSION_ID} placeholder with actual session ID
 */
export function replaceSessionIdPlaceholder(
  url: string,
  sessionId: string
): string {
  return url.replace(/{SESSION_ID}/g, sessionId);
}

/**
 * Get checkout URL for a session
 */
export function getCheckoutUrl(sessionId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/pay/${sessionId}`;
}

/**
 * Transform Prisma model to our data structure
 */
function transformSession(session: {
  id: string;
  merchantId: string;
  amount: number;
  orderId: string | null;
  description: string | null;
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string | null;
  metadata: unknown;
  status: CheckoutSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  billId: string | null;
  txHash: string | null;
  completedAt: Date | null;
  userAddress: string | null;
}): CheckoutSessionData {
  return {
    id: session.id,
    merchantId: session.merchantId,
    amount: session.amount,
    orderId: session.orderId,
    description: session.description,
    successUrl: session.successUrl,
    cancelUrl: session.cancelUrl,
    webhookUrl: session.webhookUrl,
    metadata: session.metadata as Record<string, unknown> | null,
    status: session.status,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    billId: session.billId,
    txHash: session.txHash,
    completedAt: session.completedAt,
    userAddress: session.userAddress,
  };
}
