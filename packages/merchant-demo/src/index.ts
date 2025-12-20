import "dotenv/config";
import express from "express";
import crypto from "crypto";
import { LumenLater } from "@lumenlater/merchant-sdk";

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize LumenLater SDK
const ll = new LumenLater({
  secretKey: process.env.STELLAR_SECRET_KEY!,
  apiKey: process.env.LUMENLATER_API_KEY!,
  apiBaseUrl: process.env.LUMENLATER_API_URL || "http://localhost:3000/api/v1",
});

console.log("Merchant public key:", ll.publicKey);

// Middleware - exclude webhook path from json parsing
app.use((req, res, next) => {
  if (req.path === '/webhooks/lumenlater') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Serve simple HTML pages
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Demo Merchant Store</title>
      <style>
        body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
        .product { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        button { background: #6366f1; color: white; border: none; padding: 12px 24px;
                 border-radius: 6px; cursor: pointer; font-size: 16px; }
        button:hover { background: #4f46e5; }
        input { padding: 10px; font-size: 16px; width: 200px; margin-right: 10px; }
      </style>
    </head>
    <body>
      <h1>Demo Merchant Store</h1>
      <div class="product">
        <h2>Premium Widget</h2>
        <p>A fantastic widget for all your needs.</p>
        <p><strong>Price: $10.00 USDC</strong></p>
        <form action="/checkout" method="POST">
          <input type="hidden" name="product" value="premium-widget" />
          <input type="hidden" name="amount" value="10" />
          <input type="text" name="userAddress" placeholder="Your Stellar address (G...)" required />
          <button type="submit">Buy with BNPL</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Create checkout session
app.post("/checkout", async (req, res) => {
  try {
    const { product, amount, userAddress } = req.body;
    const orderId = `order_${Date.now()}`;
    const amountNumber = parseFloat(amount);

    console.log(`Creating checkout for ${product}, amount: ${amountNumber} USDC`);
    console.log(`User address: ${userAddress}`);

    // Step 1: Create bill on-chain (merchant signs)
    console.log("Creating bill on-chain...");
    const { billId, txHash } = await ll.createBill({
      userAddress,
      amount: amountNumber,
      orderId,
    });
    console.log(`Bill created: ${billId}, tx: ${txHash}`);

    // Step 2: Create checkout session
    console.log("Creating checkout session...");
    const session = await ll.createCheckoutSession({
      billId,
      amount: amountNumber,
      orderId,
      description: `Purchase: ${product}`,
      successUrl: `http://localhost:${PORT}/success?session_id={SESSION_ID}`,
      cancelUrl: `http://localhost:${PORT}/cancel`,
      webhookUrl: `http://localhost:${PORT}/webhooks/lumenlater`,
    });

    console.log(`Checkout session created: ${session.id}`);
    console.log(`Redirecting to: ${session.url}`);

    // Redirect to LumenLater payment page
    res.redirect(session.url);
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).send(`
      <h1>Checkout Error</h1>
      <p>${error instanceof Error ? error.message : "Unknown error"}</p>
      <a href="/">Back to store</a>
    `);
  }
});

// Success page
app.get("/success", (req, res) => {
  const { session_id } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <style>
        body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .success { color: #10b981; font-size: 48px; }
      </style>
    </head>
    <body>
      <div class="success">✓</div>
      <h1>Payment Successful!</h1>
      <p>Thank you for your purchase.</p>
      <p>Session ID: ${session_id}</p>
      <a href="/">Back to store</a>
    </body>
    </html>
  `);
});

// Cancel page
app.get("/cancel", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Cancelled</title>
      <style>
        body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .cancelled { color: #f59e0b; font-size: 48px; }
      </style>
    </head>
    <body>
      <div class="cancelled">✗</div>
      <h1>Payment Cancelled</h1>
      <p>Your payment was cancelled.</p>
      <a href="/">Back to store</a>
    </body>
    </html>
  `);
});

// Webhook endpoint
app.post("/webhooks/lumenlater", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-lumenlater-signature"] as string;
  const payload = req.body.toString();

  console.log("Webhook received!");
  console.log("Signature:", signature);

  // Verify signature
  if (process.env.WEBHOOK_SECRET && signature) {
    const isValid = verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET);
    if (!isValid) {
      console.log("Invalid webhook signature!");
      return res.status(400).send("Invalid signature");
    }
    console.log("Signature verified!");
  }

  const event = JSON.parse(payload);
  console.log("Event type:", event.type);
  console.log("Event data:", JSON.stringify(event.data, null, 2));

  if (event.type === "checkout.session.completed") {
    const { order_id, bill_id, amount, user_address } = event.data;
    console.log(`Order ${order_id} completed!`);
    console.log(`Bill ID: ${bill_id}, Amount: ${amount}, User: ${user_address}`);
    // Here you would fulfill the order in your system
  }

  res.json({ received: true });
});

// Webhook signature verification
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const [timestampPart, signaturePart] = signature.split(",");
    const timestamp = timestampPart.split("=")[1];
    const expectedSignature = signaturePart.split("=")[1];

    // Check timestamp is recent (within 5 minutes)
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300) return false;

    // Verify signature
    const signedPayload = `${timestamp}.${payload}`;
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return computedSignature === expectedSignature;
  } catch {
    return false;
  }
}

app.listen(PORT, () => {
  console.log(`Demo merchant server running at http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log(`  GET  /                  - Store homepage`);
  console.log(`  POST /checkout          - Create checkout`);
  console.log(`  GET  /success           - Success page`);
  console.log(`  GET  /cancel            - Cancel page`);
  console.log(`  POST /webhooks/lumenlater - Webhook endpoint`);
});
