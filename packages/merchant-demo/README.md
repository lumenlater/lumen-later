# Merchant Demo

LumenLater Checkout API integration demo using Express.js.

## Setup

```bash
cd packages/merchant-demo
cp .env.example .env
# Edit .env with your credentials
```

## Environment Variables

```bash
# Merchant's Stellar secret key (testnet)
STELLAR_SECRET_KEY=S...

# LumenLater API key (get from dashboard)
LUMENLATER_API_KEY=ll_test_...

# Webhook secret (get from dashboard)
WEBHOOK_SECRET=whsec_...

# LumenLater API URL
LUMENLATER_API_URL=https://localhost:3301/api

# Demo server port
PORT=4100
```

## Run

```bash
# Development
pnpm dev

# Or directly
npx tsx src/index.ts
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Store homepage |
| POST | `/checkout` | Create checkout session |
| GET | `/success` | Success page |
| GET | `/cancel` | Cancel page |
| POST | `/webhooks/lumenlater` | Webhook endpoint |

## Flow

```
1. User visits store (/)
2. User enters Stellar address and clicks "Buy with BNPL"
3. Server creates bill on-chain via SDK
4. Server creates checkout session
5. User redirected to LumenLater payment page
6. User pays with BNPL
7. User redirected to success page
8. Webhook notifies merchant of completion
```

## Webhook Verification

The demo includes webhook signature verification:

```typescript
app.post("/webhooks/lumenlater",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["x-lumenlater-signature"];
    const payload = req.body.toString();

    const isValid = verifyWebhookSignature(
      payload,
      signature,
      process.env.WEBHOOK_SECRET
    );

    if (!isValid) {
      return res.status(400).send("Invalid signature");
    }

    // Process webhook...
  }
);
```

**Important:** Webhook path must use `express.raw()` middleware to preserve raw body for signature verification.

## Testing

```bash
# 1. Start LumenLater web server (port 3301)
cd apps/web && pnpm dev

# 2. Start merchant demo (port 4100)
cd packages/merchant-demo && pnpm dev

# 3. Open browser
open http://localhost:4100
```
