import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { signApiKeyJwt, verifyApiKeyJwt } from './jwt';

const API_KEY_PREFIX_LIVE = 'll_live_';
const API_KEY_PREFIX_TEST = 'll_test_';
const API_KEY_EXPIRY_DAYS = 30;

export interface CreateApiKeyResult {
  id: string;
  apiKey: string; // Full key - only returned once
  name: string;
  prefix: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  isExpired: boolean;
  isRevoked: boolean;
}

/**
 * Create a new API key for a merchant
 */
export async function createApiKey(params: {
  merchantId: string;
  name?: string;
  isTest?: boolean;
}): Promise<CreateApiKeyResult> {
  const { merchantId, name = 'Default', isTest = false } = params;

  const prefix = isTest ? API_KEY_PREFIX_TEST : API_KEY_PREFIX_LIVE;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + API_KEY_EXPIRY_DAYS);

  // Create database record first to get the ID
  const record = await prisma.merchantApiKey.create({
    data: {
      merchantId,
      name,
      keyPrefix: prefix,
      keyHash: '', // Will be updated after JWT generation
      expiresAt,
    },
  });

  // Generate JWT with the record ID
  const jwt = await signApiKeyJwt({
    merchantId,
    keyId: record.id,
    prefix,
    expiresInDays: API_KEY_EXPIRY_DAYS,
  });

  // Create the full API key
  const fullKey = `${prefix}${jwt}`;

  // Hash the key for storage
  const keyHash = hashApiKey(fullKey);

  // Update the record with the hash
  await prisma.merchantApiKey.update({
    where: { id: record.id },
    data: { keyHash },
  });

  return {
    id: record.id,
    apiKey: fullKey,
    name,
    prefix,
    expiresAt,
    createdAt: record.createdAt,
  };
}

/**
 * Verify an API key and return the merchant info
 */
export async function verifyApiKey(apiKey: string): Promise<{
  valid: boolean;
  merchantId?: string;
  keyId?: string;
  error?: string;
}> {
  // Check prefix
  const isLive = apiKey.startsWith(API_KEY_PREFIX_LIVE);
  const isTest = apiKey.startsWith(API_KEY_PREFIX_TEST);

  if (!isLive && !isTest) {
    return { valid: false, error: 'Invalid API key format' };
  }

  // Extract JWT part
  const prefix = isLive ? API_KEY_PREFIX_LIVE : API_KEY_PREFIX_TEST;
  const jwt = apiKey.slice(prefix.length);

  // Verify JWT
  const payload = await verifyApiKeyJwt(jwt);
  if (!payload) {
    return { valid: false, error: 'Invalid or expired API key' };
  }

  // Check database record
  const keyHash = hashApiKey(apiKey);
  const record = await prisma.merchantApiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null,
    },
  });

  if (!record) {
    return { valid: false, error: 'API key not found or revoked' };
  }

  // Check expiration
  if (record.expiresAt < new Date()) {
    return { valid: false, error: 'API key expired' };
  }

  // Update last used timestamp (fire and forget)
  prisma.merchantApiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {
    // Ignore errors - this is not critical
  });

  return {
    valid: true,
    merchantId: payload.sub,
    keyId: record.id,
  };
}

/**
 * List API keys for a merchant (without exposing the full key)
 */
export async function listApiKeys(merchantId: string): Promise<ApiKeyInfo[]> {
  const records = await prisma.merchantApiKey.findMany({
    where: { merchantId },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    prefix: record.keyPrefix,
    lastUsedAt: record.lastUsedAt,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    isExpired: record.expiresAt < now,
    isRevoked: record.revokedAt !== null,
  }));
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(params: {
  keyId: string;
  merchantId: string;
}): Promise<boolean> {
  const { keyId, merchantId } = params;

  const result = await prisma.merchantApiKey.updateMany({
    where: {
      id: keyId,
      merchantId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}

/**
 * Hash an API key for storage
 */
function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a random suffix for display (e.g., "...abc123")
 */
export function getApiKeySuffix(keyId: string, length = 6): string {
  // Use hash of key ID to generate consistent suffix
  const hash = createHash('sha256').update(keyId).digest('hex');
  return hash.slice(-length);
}
