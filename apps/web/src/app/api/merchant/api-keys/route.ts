import { NextRequest, NextResponse } from 'next/server';
import {
  createApiKey,
  listApiKeys,
  validateApiKeyRequest,
  getApiKeySuffix,
} from '@/lib/auth';

/**
 * POST /api/merchant/api-keys
 * Issue a new API key using wallet signature
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, message, signature, name } = body;

    // Validate required fields
    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: address, message, signature' },
        { status: 400 }
      );
    }

    // Validate signature
    const validation = validateApiKeyRequest({
      address,
      message,
      signature,
      maxAgeSeconds: 300, // 5 minutes
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid signature' },
        { status: 401 }
      );
    }

    // Check if merchant is approved (optional - can be enabled later)
    // const isApproved = await checkMerchantApproved(address);
    // if (!isApproved) {
    //   return NextResponse.json(
    //     { error: 'Merchant not approved' },
    //     { status: 403 }
    //   );
    // }

    // Create API key
    const result = await createApiKey({
      merchantId: address,
      name: name || 'Default',
      isTest: false, // TODO: Support test keys
    });

    return NextResponse.json({
      id: result.id,
      api_key: result.apiKey, // Full key - only returned once!
      name: result.name,
      prefix: result.prefix,
      suffix: getApiKeySuffix(result.id),
      expires_at: result.expiresAt.toISOString(),
      created_at: result.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/merchant/api-keys
 * List API keys for a merchant (requires wallet signature for auth)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const message = searchParams.get('message');
    const signature = searchParams.get('signature');

    // Validate required fields
    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required query params: address, message, signature' },
        { status: 400 }
      );
    }

    // Validate signature
    const validation = validateApiKeyRequest({
      address,
      message,
      signature,
      maxAgeSeconds: 300,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid signature' },
        { status: 401 }
      );
    }

    // Get API keys
    const keys = await listApiKeys(address);

    return NextResponse.json({
      keys: keys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        suffix: getApiKeySuffix(key.id),
        last_used_at: key.lastUsedAt?.toISOString() || null,
        expires_at: key.expiresAt.toISOString(),
        created_at: key.createdAt.toISOString(),
        is_expired: key.isExpired,
        is_revoked: key.isRevoked,
      })),
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}
