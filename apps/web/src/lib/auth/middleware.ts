import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from './api-key';

export interface AuthenticatedRequest {
  merchantId: string;
  keyId: string;
}

/**
 * Extract API key from Authorization header
 * Expected format: "Bearer ll_live_xxx..." or "Bearer ll_test_xxx..."
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

/**
 * Middleware to authenticate API requests using API key
 * Returns merchantId and keyId if valid, or error response
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Missing API key',
        message: 'Include API key in Authorization header: Bearer ll_live_xxx...',
      },
      { status: 401 }
    );
  }

  const result = await verifyApiKey(apiKey);

  if (!result.valid) {
    return NextResponse.json(
      {
        error: 'Invalid API key',
        message: result.error || 'API key verification failed',
      },
      { status: 401 }
    );
  }

  return {
    merchantId: result.merchantId!,
    keyId: result.keyId!,
  };
}

/**
 * Helper to check if result is an error response
 */
export function isAuthError(
  result: AuthenticatedRequest | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
