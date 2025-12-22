import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface WebhookEvent {
  type: string;
  data: {
    session_id: string;
    bill_id: string;
    amount: number;
    order_id: string;
    tx_hash: string;
    user_address: string;
    metadata: unknown;
  };
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
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
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-lumenlater-signature');
  const payload = await request.text();

  console.log('Webhook received!');
  console.log('Signature:', signature);

  // Verify signature
  if (process.env.WEBHOOK_SECRET && signature) {
    const isValid = verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET);
    if (!isValid) {
      console.log('Invalid webhook signature!');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    console.log('Signature verified!');
  }

  const event = JSON.parse(payload) as WebhookEvent;
  console.log('Event type:', event.type);
  console.log('Event data:', JSON.stringify(event.data, null, 2));

  if (event.type === 'checkout.session.completed') {
    const { order_id, bill_id, amount, user_address } = event.data;
    console.log(`Order ${order_id} completed!`);
    console.log(`Bill ID: ${bill_id}, Amount: ${amount}, User: ${user_address}`);
    // Here you would fulfill the order in your system
  }

  return NextResponse.json({ received: true });
}
