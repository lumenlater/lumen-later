import { NextRequest, NextResponse } from 'next/server';
import { ll } from '@/lib/lumenlater';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const product = formData.get('product') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const userAddress = formData.get('userAddress') as string;
    const orderId = `order_${Date.now()}`;

    // Build base URL
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:4100';
    const proto = headersList.get('x-forwarded-proto') || 'http';
    const baseUrl = `${proto}://${host}`;

    console.log(`Creating checkout for ${product}, amount: ${amount} USDC`);
    console.log(`User address: ${userAddress}`);
    console.log(`Base URL: ${baseUrl}`);

    // Step 1: Create bill on-chain
    console.log('Creating bill on-chain...');
    const { billId, txHash } = await ll.createBill({
      userAddress,
      amount,
      orderId,
    });
    console.log(`Bill created: ${billId}, tx: ${txHash}`);

    // Step 2: Create checkout session
    console.log('Creating checkout session...');
    const session = await ll.createCheckoutSession({
      billId,
      amount,
      orderId,
      description: 'NeonAI Pro Credits Pack - 1M API Credits',
      successUrl: `${baseUrl}/success?session_id={SESSION_ID}`,
      cancelUrl: `${baseUrl}/cancel`,
      webhookUrl: `${baseUrl}/api/webhooks/lumenlater`,
    });

    console.log(`Checkout session created: ${session.id}`);
    console.log(`Redirecting to: ${session.url}`);

    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
