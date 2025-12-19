/**
 * Seed script to create a test merchant with API key and webhook secret
 *
 * Usage: pnpm --filter web exec tsx scripts/seed-test-merchant.ts [merchantAddress]
 *
 * If no address provided, uses bot-merchant-001 address
 */

import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createApiKey } from '../src/lib/auth/api-key';

const prisma = new PrismaClient();

// Default test merchant address (bot-merchant-001)
const DEFAULT_MERCHANT_ADDRESS = 'GDHW2KPCNVHGFHAOWUQMF42Y6I3R6N5ZEWMIHX2G267O5MGI3COFMDC5';

async function generateWebhookSecret(): Promise<string> {
  const bytes = randomBytes(24);
  return `whsec_${bytes.toString('base64url')}`;
}

async function main() {
  const merchantAddress = process.argv[2] || DEFAULT_MERCHANT_ADDRESS;
  const merchantName = process.argv[3] || 'Test Merchant';

  console.log('🔧 Seeding Test Merchant');
  console.log('========================');
  console.log(`Address: ${merchantAddress}`);
  console.log(`Name: ${merchantName}`);
  console.log('');

  try {
    // 1. Create or update Merchant record
    const webhookSecret = await generateWebhookSecret();

    const merchant = await prisma.merchant.upsert({
      where: { address: merchantAddress },
      create: {
        address: merchantAddress,
        name: merchantName,
        webhookSecret,
      },
      update: {
        name: merchantName,
        webhookSecret, // Regenerate on re-run
      },
    });

    console.log('✅ Merchant created/updated');
    console.log(`   ID: ${merchant.id}`);
    console.log(`   Webhook Secret: ${webhookSecret}`);
    console.log('');

    // 2. Create API key
    const apiKeyResult = await createApiKey({
      merchantId: merchantAddress,
      name: 'Test API Key',
      isTest: true, // Use test prefix
    });

    console.log('✅ API Key created');
    console.log(`   Key ID: ${apiKeyResult.id}`);
    console.log(`   Expires: ${apiKeyResult.expiresAt.toISOString()}`);
    console.log('');

    // 3. Output environment variables
    console.log('📋 Add these to your .env file:');
    console.log('================================');
    console.log(`STELLAR_SECRET_KEY=<get with: stellar keys show bot-merchant-001>`);
    console.log(`LUMENLATER_API_KEY=${apiKeyResult.apiKey}`);
    console.log(`WEBHOOK_SECRET=${webhookSecret}`);
    console.log(`LUMENLATER_API_URL=http://localhost:3000/api/v1`);
    console.log('');

    // 4. Also output for copying
    console.log('📦 Full credentials JSON:');
    console.log(JSON.stringify({
      merchant: {
        address: merchantAddress,
        name: merchantName,
        webhookSecret,
      },
      apiKey: {
        id: apiKeyResult.id,
        key: apiKeyResult.apiKey,
        expiresAt: apiKeyResult.expiresAt.toISOString(),
      },
    }, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
