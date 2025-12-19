import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// Get secret from environment
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
};

export interface ApiKeyPayload extends JWTPayload {
  /** Merchant wallet address */
  sub: string;
  /** Key ID in database */
  kid: string;
  /** Key prefix (ll_live_ or ll_test_) */
  prefix: string;
}

/**
 * Sign a JWT for API key
 */
export async function signApiKeyJwt(payload: {
  merchantId: string;
  keyId: string;
  prefix: string;
  expiresInDays?: number;
}): Promise<string> {
  const { merchantId, keyId, prefix, expiresInDays = 30 } = payload;

  const jwt = await new SignJWT({
    prefix,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(merchantId)
    .setJti(keyId)
    .setIssuedAt()
    .setExpirationTime(`${expiresInDays}d`)
    .setIssuer('lumenlater')
    .sign(getJwtSecret());

  return jwt;
}

/**
 * Verify and decode an API key JWT
 */
export async function verifyApiKeyJwt(token: string): Promise<ApiKeyPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: 'lumenlater',
    });

    // Validate required fields
    if (!payload.sub || !payload.jti) {
      return null;
    }

    return {
      ...payload,
      sub: payload.sub,
      kid: payload.jti,
      prefix: (payload.prefix as string) || 'unknown',
    };
  } catch {
    return null;
  }
}

/**
 * Extract expiration date from JWT without verification
 * (useful for display purposes)
 */
export function getJwtExpiration(token: string): Date | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}
