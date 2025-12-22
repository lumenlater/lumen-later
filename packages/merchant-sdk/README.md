# @lumenlater/merchant-sdk

Server-side SDK for LumenLater merchants to create bills and checkout sessions.

## Installation

```bash
# In monorepo
pnpm add @lumenlater/merchant-sdk
```

## Quick Start

```typescript
import { LumenLater } from "@lumenlater/merchant-sdk";

const ll = new LumenLater({
  secretKey: process.env.STELLAR_SECRET_KEY,  // Merchant's Stellar secret key
  apiKey: process.env.LUMENLATER_API_KEY,     // LumenLater API key
  apiBaseUrl: "https://app.lumenlater.com/api", // Optional: API URL
});

// Step 1: Create a bill on-chain
const { billId, txHash } = await ll.createBill({
  userAddress: "GUSER...",  // Customer's Stellar address
  amount: 100.00,           // USDC amount
  orderId: "order-123",
});

// Step 2: Create a checkout session
const session = await ll.createCheckoutSession({
  billId,
  amount: 100.00,
  orderId: "order-123",
  description: "Premium Widget",
  successUrl: "https://your-site.com/success?session_id={SESSION_ID}",
  cancelUrl: "https://your-site.com/cancel",
  webhookUrl: "https://your-site.com/webhooks/lumenlater",
});

// Step 3: Redirect user to payment page
res.redirect(session.url);
```

## API Reference

### `new LumenLater(config)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `secretKey` | string | Yes | Merchant's Stellar secret key |
| `apiKey` | string | Yes | LumenLater API key |
| `apiBaseUrl` | string | No | API base URL (default: production) |
| `rpcUrl` | string | No | Stellar RPC URL (default: testnet) |
| `networkPassphrase` | string | No | Network passphrase (default: testnet) |
| `contractId` | string | No | BNPL contract ID (default: testnet) |

### `ll.createBill(params)`

Creates a bill on-chain. Requires merchant signature.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAddress` | string | Yes | Customer's Stellar public key |
| `amount` | number | Yes | Amount in USDC (e.g., 100.00) |
| `orderId` | string | Yes | Your order reference ID |

**Returns:** `{ billId: string, txHash: string }`

### `ll.createCheckoutSession(params)`

Creates a checkout session for the payment flow.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `billId` | string | Yes | On-chain bill ID from createBill |
| `amount` | number | Yes | Amount in USDC (must match bill) |
| `orderId` | string | No | Your order reference ID |
| `description` | string | No | Description shown to user |
| `successUrl` | string | Yes | Redirect URL after payment |
| `cancelUrl` | string | Yes | Redirect URL if cancelled |
| `webhookUrl` | string | No | URL for webhook notifications |
| `metadata` | object | No | Arbitrary metadata |

**Returns:** `CheckoutSession`

```typescript
interface CheckoutSession {
  id: string;           // Session ID (e.g., "cs_xxx")
  url: string;          // Payment page URL
  billId: string;       // On-chain bill ID
  status: "pending" | "completed" | "expired" | "cancelled";
  expiresAt: string;    // ISO timestamp
}
```

### `ll.getBill(billId)`

Get bill details from on-chain.

### `ll.publicKey`

Get merchant's public key.

## Webhook Integration

When a payment is completed, LumenLater sends a webhook to your `webhookUrl`.

### Webhook Payload

```json
{
  "type": "checkout.session.completed",
  "data": {
    "session_id": "cs_xxx",
    "bill_id": "123",
    "amount": 100,
    "order_id": "order-123",
    "tx_hash": "abc123...",
    "user_address": "GUSER...",
    "metadata": null
  }
}
```

### Signature Verification

Webhooks include a signature header for verification:

```
X-LumenLater-Signature: t=1234567890,v1=abc123...
```

```typescript
import crypto from "crypto";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const [timestampPart, signaturePart] = signature.split(",");
  const timestamp = timestampPart.split("=")[1];
  const expectedSignature = signaturePart.split("=")[1];

  // Check timestamp is recent (within 5 minutes)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) return false;

  // Verify HMAC signature
  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return computedSignature === expectedSignature;
}
```

## Environment Variables

```bash
# Required
STELLAR_SECRET_KEY=S...     # Merchant's Stellar secret key
LUMENLATER_API_KEY=ll_...   # API key from dashboard

# Optional
LUMENLATER_API_URL=https://app.lumenlater.com/api
WEBHOOK_SECRET=whsec_...    # For webhook verification
```

## Example: Express.js Integration

See [merchant-demo](../merchant-demo) for a complete example.

```typescript
import express from "express";
import { LumenLater } from "@lumenlater/merchant-sdk";

const app = express();
const ll = new LumenLater({
  secretKey: process.env.STELLAR_SECRET_KEY!,
  apiKey: process.env.LUMENLATER_API_KEY!,
});

// Checkout endpoint
app.post("/checkout", async (req, res) => {
  const { product, amount, userAddress } = req.body;

  // Create bill on-chain
  const { billId } = await ll.createBill({
    userAddress,
    amount: parseFloat(amount),
    orderId: `order_${Date.now()}`,
  });

  // Create checkout session
  const session = await ll.createCheckoutSession({
    billId,
    amount: parseFloat(amount),
    description: product,
    successUrl: "http://localhost:3000/success?session_id={SESSION_ID}",
    cancelUrl: "http://localhost:3000/cancel",
    webhookUrl: "http://localhost:3000/webhooks/lumenlater",
  });

  res.redirect(session.url);
});

// Webhook endpoint (use raw body for signature verification)
app.post("/webhooks/lumenlater",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["x-lumenlater-signature"];
    const payload = req.body.toString();

    if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET!)) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(payload);
    if (event.type === "checkout.session.completed") {
      // Fulfill the order
      console.log("Order completed:", event.data.order_id);
    }

    res.json({ received: true });
  }
);
```

## License

MIT
