import { Keypair } from '@stellar/stellar-sdk';

/**
 * Message format for API key issuance
 * Format: "lumenlater:api-key:{address}:{timestamp}:{nonce}"
 */
export interface ApiKeySignatureMessage {
  address: string;
  timestamp: number;
  nonce: string;
}

/**
 * Parse the signature message
 */
export function parseApiKeyMessage(message: string): ApiKeySignatureMessage | null {
  const parts = message.split(':');
  if (parts.length !== 5) return null;

  const [prefix1, prefix2, address, timestampStr, nonce] = parts;
  if (prefix1 !== 'lumenlater' || prefix2 !== 'api-key') return null;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  return { address, timestamp, nonce };
}

/**
 * Generate a message for API key signing
 */
export function generateApiKeyMessage(address: string): {
  message: string;
  timestamp: number;
  nonce: string;
} {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();
  const message = `lumenlater:api-key:${address}:${timestamp}:${nonce}`;

  return { message, timestamp, nonce };
}

/**
 * Verify a Stellar signature
 */
export function verifyStellarSignature(
  publicKey: string,
  message: string,
  signatureBase64: string
): boolean {
  try {
    const keypair = Keypair.fromPublicKey(publicKey);
    const messageBuffer = Buffer.from(message, 'utf-8');
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');

    return keypair.verify(messageBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

/**
 * Validate API key signature request
 * - Verifies signature
 * - Checks timestamp is within acceptable range (5 minutes)
 * - Validates address matches signer
 */
export function validateApiKeyRequest(params: {
  address: string;
  message: string;
  signature: string;
  maxAgeSeconds?: number;
}): { valid: boolean; error?: string } {
  const { address, message, signature, maxAgeSeconds = 300 } = params;

  // Parse message
  const parsed = parseApiKeyMessage(message);
  if (!parsed) {
    return { valid: false, error: 'Invalid message format' };
  }

  // Check address matches
  if (parsed.address !== address) {
    return { valid: false, error: 'Address mismatch' };
  }

  // Check timestamp is recent
  const now = Math.floor(Date.now() / 1000);
  const age = now - parsed.timestamp;
  if (age < 0 || age > maxAgeSeconds) {
    return { valid: false, error: 'Signature expired or timestamp invalid' };
  }

  // Verify signature
  const isValid = verifyStellarSignature(address, message, signature);
  if (!isValid) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Generate a random nonce for signature uniqueness
 */
function generateNonce(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
