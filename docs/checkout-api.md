# LumenLater Checkout API

Redirect-based checkout flow for merchant integration, similar to Stripe Checkout.

## Overview

The Checkout API allows merchants to accept BNPL payments by redirecting customers to a hosted payment page. After payment, customers are redirected back to the merchant's site.

## Authentication

All API requests require an API key obtained through wallet signature authentication.

### Obtaining an API Key

1. Visit `/merchant/settings/api-keys` in the LumenLater dashboard
2. Connect your merchant wallet
3. Sign a message to authenticate
4. Create a new API key (keys expire after 30 days)

### Using the API Key

Include the API key in the `Authorization` header:

```
Authorization: Bearer ll_live_xxxxx...
```

## Checkout Flow

```
1. Merchant creates a checkout session via API
2. User is redirected to LumenLater payment page
3. User connects wallet and confirms BNPL payment
4. User is redirected to merchant's success_url
5. (Optional) Webhook notification sent to merchant
```

## API Reference

### Create Checkout Session

Create a new checkout session for a customer purchase.

**Endpoint:** `POST /api/checkout/sessions`

**Headers:**
```
Authorization: Bearer ll_live_xxxxx
Content-Type: application/json
```

**Request Body:**
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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Amount in stroops (7 decimal places). 10000000 = $1.00 |
| `order_id` | string | No | Your internal order reference |
| `description` | string | No | Description shown to customer |
| `success_url` | string | Yes | URL to redirect after successful payment. Use `{SESSION_ID}` placeholder. |
| `cancel_url` | string | Yes | URL to redirect if customer cancels |
| `webhook_url` | string | No | URL for webhook notifications |
| `metadata` | object | No | Arbitrary data to store with the session |

**Response:**
```json
{
  "id": "cs_clxxxxxxxxx",
  "checkout_url": "https://lumenlater.com/pay/cs_clxxxxxxxxx",
  "amount": 10000000,
  "order_id": "order_123",
  "status": "pending",
  "expires_at": "2024-12-19T01:00:00Z",
  "created_at": "2024-12-19T00:00:00Z"
}
```

### Get Checkout Session

Retrieve the status of a checkout session.

**Endpoint:** `GET /api/checkout/sessions/{session_id}`

**Headers:**
```
Authorization: Bearer ll_live_xxxxx
```

**Response (Pending):**
```json
{
  "id": "cs_clxxxxxxxxx",
  "amount": 10000000,
  "order_id": "order_123",
  "description": "Product purchase",
  "status": "pending",
  "expires_at": "2024-12-19T01:00:00Z",
  "created_at": "2024-12-19T00:00:00Z",
  "metadata": {}
}
```

**Response (Completed):**
```json
{
  "id": "cs_clxxxxxxxxx",
  "amount": 10000000,
  "order_id": "order_123",
  "description": "Product purchase",
  "status": "completed",
  "bill_id": "123",
  "tx_hash": "abc123...",
  "user_address": "GXXXX...",
  "completed_at": "2024-12-19T00:30:00Z",
  "expires_at": "2024-12-19T01:00:00Z",
  "created_at": "2024-12-19T00:00:00Z",
  "metadata": {}
}
```

**Session Status Values:**
- `pending` - Waiting for customer payment
- `completed` - Payment successful
- `expired` - Session timed out (1 hour)
- `cancelled` - Customer cancelled

## Webhooks

Receive real-time notifications when checkout sessions are completed.

### Webhook Payload

```json
{
  "id": "evt_cs_clxxxxxxxxx",
  "type": "checkout.session.completed",
  "created": 1703001234,
  "data": {
    "session_id": "cs_clxxxxxxxxx",
    "bill_id": "123",
    "amount": 10000000,
    "order_id": "order_123",
    "tx_hash": "abc123...",
    "user_address": "GXXXX...",
    "metadata": {}
  }
}
```

### Verifying Webhook Signatures

Webhooks include a signature header for verification:

```
X-LumenLater-Signature: t=1703001234,v1=sha256hash...
```

To verify:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const [timestampPart, signaturePart] = signature.split(',');
  const timestamp = timestampPart.split('=')[1];
  const expectedSignature = signaturePart.split('=')[1];

  // Check timestamp is recent (within 5 minutes)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) return false;

  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return computedSignature === expectedSignature;
}
```

### Retry Policy

Failed webhook deliveries are retried up to 3 times:
- 1st retry: After 1 minute
- 2nd retry: After 5 minutes
- 3rd retry: After 15 minutes

## Example Integration

### Node.js / Express

```javascript
const express = require('express');
const app = express();

const LUMENLATER_API_KEY = 'll_live_xxxxx';
const LUMENLATER_API_URL = 'https://lumenlater.com/api';

// Create checkout session
app.post('/create-checkout', async (req, res) => {
  const { amount, orderId } = req.body;

  const response = await fetch(`${LUMENLATER_API_URL}/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LUMENLATER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount * 10000000, // Convert to stroops
      order_id: orderId,
      success_url: `${process.env.BASE_URL}/success?session_id={SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cancel`,
      webhook_url: `${process.env.BASE_URL}/webhooks/lumenlater`,
    }),
  });

  const session = await response.json();
  res.json({ checkoutUrl: session.checkout_url });
});

// Success page
app.get('/success', async (req, res) => {
  const { session_id } = req.query;

  // Verify session status
  const response = await fetch(
    `${LUMENLATER_API_URL}/checkout/sessions/${session_id}`,
    {
      headers: {
        'Authorization': `Bearer ${LUMENLATER_API_KEY}`,
      },
    }
  );

  const session = await response.json();

  if (session.status === 'completed') {
    // Fulfill the order
    res.render('success', { orderId: session.order_id });
  } else {
    res.redirect('/checkout-failed');
  }
});

// Webhook handler
app.post('/webhooks/lumenlater', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-lumenlater-signature'];
  const payload = req.body.toString();

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(payload);

  if (event.type === 'checkout.session.completed') {
    const { order_id, bill_id } = event.data;
    // Fulfill the order
    console.log(`Order ${order_id} paid with bill ${bill_id}`);
  }

  res.json({ received: true });
});
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "message": "Detailed description"
}
```

**Common Error Codes:**
- `400` - Invalid request (missing fields, invalid values)
- `401` - Invalid or missing API key
- `404` - Resource not found
- `500` - Server error

## Rate Limits

- 100 requests per minute per API key
- Exceeding limits returns `429 Too Many Requests`

## BNPL Terms

When customers pay with LumenLater BNPL:
- 14-day interest-free repayment period
- 111% collateralization required
- No upfront payment required
- Merchant receives immediate payment (minus 1.5% fee)
