import { NextRequest, NextResponse } from 'next/server';
import { revokeApiKey, validateApiKeyRequest } from '@/lib/auth';

/**
 * DELETE /api/merchant/api-keys/[id]
 * Revoke an API key (requires wallet signature)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;
    const body = await request.json();
    const { address, message, signature } = body;

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
      maxAgeSeconds: 300,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid signature' },
        { status: 401 }
      );
    }

    // Revoke the key
    const revoked = await revokeApiKey({
      keyId,
      merchantId: address,
    });

    if (!revoked) {
      return NextResponse.json(
        { error: 'API key not found or already revoked' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
