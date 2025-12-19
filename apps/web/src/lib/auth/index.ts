// JWT utilities
export {
  signApiKeyJwt,
  verifyApiKeyJwt,
  getJwtExpiration,
  type ApiKeyPayload,
} from './jwt';

// Stellar signature verification
export {
  verifyStellarSignature,
  validateApiKeyRequest,
  generateApiKeyMessage,
  parseApiKeyMessage,
  type ApiKeySignatureMessage,
} from './stellar-signature';

// API key management
export {
  createApiKey,
  verifyApiKey,
  listApiKeys,
  revokeApiKey,
  getApiKeySuffix,
  type CreateApiKeyResult,
  type ApiKeyInfo,
} from './api-key';

// Authentication middleware
export {
  authenticateApiKey,
  isAuthError,
  type AuthenticatedRequest,
} from './middleware';
