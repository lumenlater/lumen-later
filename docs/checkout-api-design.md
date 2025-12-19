# Checkout API Design Document

> **Status**: In Progress
> **Branch**: `feature/checkout-api`
> **Last Updated**: 2024-12-19

## Overview

Redirect-based checkout flow for merchant integration, similar to Stripe Checkout.

## Implementation Checklist

### Phase 1: Foundation
- [x] DB Schema - MerchantApiKey model
- [x] DB Schema - CheckoutSession model
- [x] DB Schema - WebhookDelivery model
- [x] JWT utility functions (sign, verify)
- [x] Stellar signature verification utility
- [x] API key generation/verification utility

### Phase 2: API Key Management
- [x] POST /api/merchant/api-keys - Issue API key (wallet signature)
- [x] GET /api/merchant/api-keys - List API keys
- [x] DELETE /api/merchant/api-keys/[id] - Revoke API key
- [x] Middleware for API key authentication

### Phase 3: Checkout Session
- [x] POST /api/checkout/sessions - Create session
- [x] GET /api/checkout/sessions/[id] - Get session status
- [x] Session management utilities (create, complete, cancel)

### Phase 4: Payment Page
- [ ] /pay/[sessionId] - User-facing payment page
- [ ] Wallet connection flow
- [ ] Bill creation on-chain
- [ ] Success/Cancel redirect handling

### Phase 5: Webhook
- [ ] Webhook dispatch on payment completion
- [ ] Webhook signature for verification
- [ ] Retry logic for failed webhooks

### Phase 6: Merchant Dashboard UI
- [ ] API Keys management page
- [ ] Webhook URL configuration
- [ ] Integration guide/docs

---

## Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. API Key Issuance (One-time, via Dashboard)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Merchant Wallet                    LumenLater                  │
│       │                                  │                      │
│       │  Sign: "lumenlater:api-key:      │                      │
│       │  {address}:{timestamp}:{nonce}"  │                      │
│       │ ────────────────────────────────>│                      │
│       │                                  │ Verify signature     │
│       │                                  │ Generate JWT (30d)   │
│       │  { api_key: "ll_live_xxx..." }   │                      │
│       │ <────────────────────────────────│                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Checkout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  2. Create Checkout Session                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Merchant Server                    LumenLater API              │
│       │                                  │                      │
│       │  POST /api/checkout/sessions     │                      │
│       │  Authorization: Bearer ll_live_x │                      │
│       │  {                               │                      │
│       │    amount: 10000000,             │                      │
│       │    order_id: "order_123",        │                      │
│       │    success_url: "https://...",   │                      │
│       │    cancel_url: "https://...",    │                      │
│       │    webhook_url: "https://..."    │                      │
│       │  }                               │                      │
│       │ ────────────────────────────────>│                      │
│       │                                  │                      │
│       │  {                               │                      │
│       │    id: "cs_xxx",                 │                      │
│       │    checkout_url: "/pay/cs_xxx",  │                      │
│       │    expires_at: "..."             │                      │
│       │  }                               │                      │
│       │ <────────────────────────────────│                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  3. User Payment                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Browser                       LumenLater                  │
│       │                                  │                      │
│       │  Redirect to /pay/cs_xxx         │                      │
│       │ ────────────────────────────────>│                      │
│       │                                  │                      │
│       │  [Payment Page]                  │                      │
│       │  - Connect wallet                │                      │
│       │  - Review amount                 │                      │
│       │  - Confirm payment               │                      │
│       │                                  │                      │
│       │  Sign Soroban transaction        │                      │
│       │ ────────────────────────────────>│ Create bill on-chain │
│       │                                  │                      │
│       │  Redirect to success_url         │                      │
│       │ <────────────────────────────────│                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  4. Webhook Notification                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Merchant Server                    LumenLater                  │
│       │                                  │                      │
│       │  POST {webhook_url}              │                      │
│       │  X-LumenLater-Signature: xxx     │                      │
│       │  {                               │                      │
│       │    event: "checkout.completed",  │                      │
│       │    session_id: "cs_xxx",         │                      │
│       │    bill_id: "123",               │                      │
│       │    amount: 10000000,             │                      │
│       │    order_id: "order_123"         │                      │
│       │  }                               │                      │
│       │ <────────────────────────────────│                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### MerchantApiKey

```prisma
model MerchantApiKey {
  id            String    @id @default(cuid())
  merchantId    String    // wallet address
  name          String    @default("Default")
  keyPrefix     String    // "ll_live_" or "ll_test_"
  keyHash       String    // SHA256 hash of full key (for lookup)
  lastUsedAt    DateTime?
  expiresAt     DateTime
  revokedAt     DateTime?
  createdAt     DateTime  @default(now())

  @@index([merchantId])
  @@index([keyHash])
}
```

### CheckoutSession

```prisma
model CheckoutSession {
  id            String    @id // "cs_" + cuid()
  merchantId    String
  amount        BigInt
  orderId       String?
  description   String?
  successUrl    String
  cancelUrl     String
  webhookUrl    String?
  metadata      Json?     // arbitrary merchant data
  status        String    @default("pending") // pending, completed, expired, cancelled
  billId        String?   // on-chain bill ID after completion
  txHash        String?   // transaction hash
  expiresAt     DateTime  // 1 hour from creation
  createdAt     DateTime  @default(now())
  completedAt   DateTime?

  @@index([merchantId])
  @@index([status])
}
```

---

## API Specifications

### POST /api/merchant/api-keys

**Request:**
```json
{
  "address": "GXXX...",
  "signature": "base64...",
  "message": "lumenlater:api-key:GXXX...:1703001234:abc123",
  "name": "Production Key"
}
```

**Response:**
```json
{
  "id": "key_xxx",
  "api_key": "ll_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Production Key",
  "expires_at": "2025-01-18T00:00:00Z",
  "created_at": "2024-12-19T00:00:00Z"
}
```

> Note: `api_key` is only returned once at creation time

### POST /api/checkout/sessions

**Headers:**
```
Authorization: Bearer ll_live_xxx...
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 10000000,
  "order_id": "order_123",
  "description": "Product purchase",
  "success_url": "https://merchant.com/success?session_id={SESSION_ID}",
  "cancel_url": "https://merchant.com/cancel",
  "webhook_url": "https://merchant.com/webhooks/lumenlater",
  "metadata": {
    "customer_id": "cust_123"
  }
}
```

**Response:**
```json
{
  "id": "cs_xxx",
  "checkout_url": "https://lumenlater.com/pay/cs_xxx",
  "amount": 10000000,
  "status": "pending",
  "expires_at": "2024-12-19T01:00:00Z"
}
```

### GET /api/checkout/sessions/[id]

**Response:**
```json
{
  "id": "cs_xxx",
  "amount": 10000000,
  "order_id": "order_123",
  "status": "completed",
  "bill_id": "123",
  "tx_hash": "abc...",
  "completed_at": "2024-12-19T00:30:00Z"
}
```

---

## Webhook Payload

```json
{
  "id": "evt_xxx",
  "type": "checkout.session.completed",
  "created": 1703001234,
  "data": {
    "session_id": "cs_xxx",
    "bill_id": "123",
    "amount": 10000000,
    "order_id": "order_123",
    "tx_hash": "abc...",
    "metadata": {}
  }
}
```

**Signature Header:**
```
X-LumenLater-Signature: t=1703001234,v1=sha256hash...
```

---

## File Structure

```
apps/web/src/
├── app/
│   ├── api/
│   │   ├── merchant/
│   │   │   └── api-keys/
│   │   │       ├── route.ts              # POST (issue), GET (list)
│   │   │       └── [id]/
│   │   │           └── route.ts          # DELETE (revoke)
│   │   └── checkout/
│   │       └── sessions/
│   │           ├── route.ts              # POST (create)
│   │           └── [id]/
│   │               └── route.ts          # GET (status)
│   ├── pay/
│   │   └── [sessionId]/
│   │       └── page.tsx                  # Payment page
│   └── merchant/
│       └── settings/
│           └── api-keys/
│               └── page.tsx              # API key management UI
├── lib/
│   ├── auth/
│   │   ├── api-key.ts                    # API key generation/verification
│   │   ├── jwt.ts                        # JWT utilities
│   │   └── stellar-signature.ts          # Stellar signature verification
│   ├── checkout/
│   │   ├── session.ts                    # Session management
│   │   └── webhook.ts                    # Webhook dispatch
│   └── middleware/
│       └── api-key-auth.ts               # API key auth middleware
```

---

## Security Considerations

1. **API Key Storage**: Only hash stored in DB, full key shown once
2. **Signature Verification**: Stellar SDK for ed25519 verification
3. **Webhook Security**: HMAC signature with timestamp to prevent replay
4. **Session Expiry**: 1 hour, auto-expire via cron or lazy check
5. **Rate Limiting**: Consider adding rate limits per API key

---

## Commit Plan

1. `chore(db): add MerchantApiKey and CheckoutSession schemas`
2. `feat(lib): add JWT and Stellar signature utilities`
3. `feat(api): implement API key issuance endpoint`
4. `feat(api): implement checkout sessions endpoint`
5. `feat(web): create payment page for checkout sessions`
6. `feat(lib): add webhook dispatch with signature`
7. `feat(web): add API key management UI`
8. `docs: finalize checkout API documentation`
