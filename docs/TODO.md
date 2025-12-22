# LumenLater TODO

## Checkout API - Completed

- [x] Merchant SDK (`@lumenlater/merchant-sdk`)
- [x] Checkout Sessions API (`POST /api/checkout/sessions`)
- [x] Payment Page (`/pay/[sessionId]`)
- [x] Complete API (`POST /api/pay/[sessionId]/complete`)
- [x] Webhook dispatch with signature verification
- [x] API Key management (create, revoke, list)
- [x] Webhook secret management (separate from API keys)
- [x] Merchant Demo (Express.js example)

## Documentation - In Progress

- [x] `docs/checkout-api.md` - API reference
- [x] `packages/merchant-sdk/README.md` - SDK usage
- [x] `packages/merchant-demo/README.md` - Demo guide
- [ ] **GitBook documentation site**
  - Developer guide
  - API reference
  - Integration tutorials
  - Webhook handling guide

## Future Tasks

### npm Publishing
- [ ] Publish `@lumenlater/bnpl-core-client` to npm
- [ ] Publish `@lumenlater/merchant-sdk` to npm
- [ ] Setup npm org `@lumenlater`

### Mainnet Preparation
- [ ] Mainnet contract deployment
- [ ] Production API URL configuration
- [ ] Rate limiting
- [ ] API key rotation policy

### Dashboard Enhancements
- [ ] Merchant dashboard with transaction history
- [ ] Webhook delivery logs and retry UI
- [ ] API usage analytics

### SDK Improvements
- [ ] Add retry logic for failed API calls
- [ ] Add TypeScript strict mode
- [ ] Add unit tests
- [ ] Support for multiple currencies (future)
