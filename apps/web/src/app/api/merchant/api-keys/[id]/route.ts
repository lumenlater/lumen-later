import { NextRequest, NextResponse } from 'next/server';
import { revokeApiKey } from '@/lib/auth';

/**
 * DELETE /api/merchant/api-keys/[id]
 * Revoke an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;
    const body = await request.json();
    const { address } = body;

    // Validate required fields
    if (!address) {
      return NextResponse.json(
        { error: 'Missing required field: address' },
        { status: 400 }
      );
    }

    // TODO: Implement SEP-0010 Web Authentication for proper signature verification
    // Validate address format
    if (!address.startsWith('G') || address.length !== 56) {
      return NextResponse.json(
        { error: 'Invalid Stellar address format' },
        { status: 400 }
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
