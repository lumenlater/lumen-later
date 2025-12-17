import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import { BillStatus } from '@prisma/client-postgres';

/**
 * POST /api/indexer/webhook
 *
 * Goldsky handler endpoint - processes contract events and saves to parsed tables.
 * Receives events from Goldsky pipeline handler transform.
 */

// Event type symbols from contract
const EVENT_TYPES = {
  BILL_CREATED: 'bill_new',
  BILL_PAID: 'payment',
  BILL_REPAID: 'repayment',
  BILL_LIQUIDATED: 'liquidate',
  MERCHANT_ENROLLED: 'm_enroll',
  MERCHANT_STATUS: 'm_status',
} as const;

interface GoldskyEvent {
  id: string;
  type: string;
  contract_id: string;
  topics: string | null;
  data: string | null;
  transaction_hash: string;
  ledger_sequence: number;
  ledger_closed_at: string;
  in_successful_contract_call: boolean;
}

interface SorobanValue {
  symbol?: string;
  address?: string;
  u64?: string;
  i128?: string;
  string?: string;
  map?: Array<{ key: SorobanValue; val: SorobanValue }>;
}

/**
 * Parse Soroban XDR JSON topics
 */
function parseTopics(topicsJson: string | null): { eventType: string; values: string[] } | null {
  if (!topicsJson) return null;

  try {
    const topics: SorobanValue[] = JSON.parse(topicsJson);
    if (!Array.isArray(topics) || topics.length === 0) return null;

    // First topic is the event type (symbol)
    const eventType = topics[0].symbol;
    if (!eventType) return null;

    // Rest are values
    const values = topics.slice(1).map(extractSorobanValue);

    return { eventType, values };
  } catch (e) {
    console.error('Failed to parse topics:', e);
    return null;
  }
}

/**
 * Extract value from Soroban XDR JSON format
 */
function extractSorobanValue(val: SorobanValue): string {
  if (val.symbol) return val.symbol;
  if (val.address) return val.address;
  if (val.u64) return val.u64;
  if (val.i128) return val.i128;
  if (val.string) return val.string;
  return '';
}

/**
 * Parse Soroban map data to object
 */
function parseEventData(dataJson: string | null): Record<string, string> | null {
  if (!dataJson) return null;

  try {
    const data = JSON.parse(dataJson);

    // Handle map format: { map: [{ key: {symbol: "name"}, val: {type: "value"} }] }
    if (data.map && Array.isArray(data.map)) {
      const result: Record<string, string> = {};
      for (const item of data.map) {
        const key = item.key?.symbol;
        const val = extractSorobanValue(item.val);
        if (key) {
          result[key] = val;
        }
      }
      return result;
    }

    return null;
  } catch (e) {
    console.error('Failed to parse event data:', e);
    return null;
  }
}

/**
 * Process a single event and update the database
 */
async function processEvent(event: GoldskyEvent): Promise<{ processed: boolean; type?: string; error?: string }> {
  // Skip failed transactions
  if (!event.in_successful_contract_call) {
    return { processed: false, error: 'Failed transaction' };
  }

  const parsed = parseTopics(event.topics);
  if (!parsed) {
    return { processed: false, error: 'Could not parse topics' };
  }

  const { eventType, values } = parsed;
  const ledgerSequence = BigInt(event.ledger_sequence);

  try {
    switch (eventType) {
      case EVENT_TYPES.BILL_CREATED: {
        const data = parseEventData(event.data);
        if (!data) return { processed: false, error: 'Could not parse bill data' };

        const billId = data.bill_id;
        const merchant = data.merchant;
        const user = data.user;
        const amount = data.amount;
        const orderId = data.order_id;

        if (!billId || !merchant || !user || !amount) {
          return { processed: false, error: 'Missing required bill fields' };
        }

        await prismaPostgres.parsedBill.upsert({
          where: { billId: BigInt(billId) },
          create: {
            billId: BigInt(billId),
            contractId: event.contract_id,
            merchant,
            user,
            amount: BigInt(amount),
            orderId: orderId || '',
            status: BillStatus.CREATED,
            sourceEventId: event.id,
            ledgerSequence,
            txHash: event.transaction_hash,
          },
          update: {
            // Don't overwrite if already exists
          },
        });

        console.log(`[Webhook] Created bill #${billId}`);
        return { processed: true, type: 'bill_created' };
      }

      case EVENT_TYPES.BILL_PAID: {
        const data = parseEventData(event.data);
        if (!data) return { processed: false, error: 'Could not parse payment data' };

        const billId = data.bill_id;
        if (!billId) return { processed: false, error: 'Missing bill_id' };

        await prismaPostgres.parsedBill.update({
          where: { billId: BigInt(billId) },
          data: {
            status: BillStatus.PAID,
            paidAt: new Date(event.ledger_closed_at),
          },
        });

        console.log(`[Webhook] Bill #${billId} paid`);
        return { processed: true, type: 'bill_paid' };
      }

      case EVENT_TYPES.BILL_REPAID: {
        const data = parseEventData(event.data);
        if (!data) return { processed: false, error: 'Could not parse repayment data' };

        const billId = data.bill_id;
        if (!billId) return { processed: false, error: 'Missing bill_id' };

        await prismaPostgres.parsedBill.update({
          where: { billId: BigInt(billId) },
          data: {
            status: BillStatus.REPAID,
            repaidAt: new Date(event.ledger_closed_at),
          },
        });

        console.log(`[Webhook] Bill #${billId} repaid`);
        return { processed: true, type: 'bill_repaid' };
      }

      case EVENT_TYPES.BILL_LIQUIDATED: {
        const data = parseEventData(event.data);
        if (!data) return { processed: false, error: 'Could not parse liquidation data' };

        const billId = data.bill_id;
        if (!billId) return { processed: false, error: 'Missing bill_id' };

        await prismaPostgres.parsedBill.update({
          where: { billId: BigInt(billId) },
          data: {
            status: BillStatus.LIQUIDATED,
            liquidatedAt: new Date(event.ledger_closed_at),
          },
        });

        console.log(`[Webhook] Bill #${billId} liquidated`);
        return { processed: true, type: 'bill_liquidated' };
      }

      case EVENT_TYPES.MERCHANT_ENROLLED: {
        const data = parseEventData(event.data);
        if (!data) return { processed: false, error: 'Could not parse merchant data' };

        const merchant = data.merchant;
        if (!merchant) return { processed: false, error: 'Missing merchant address' };

        await prismaPostgres.parsedMerchant.upsert({
          where: { address: merchant },
          create: {
            address: merchant,
            contractId: event.contract_id,
            isActive: true,
            enrolledAt: new Date(event.ledger_closed_at),
            sourceEventId: event.id,
            ledgerSequence,
            txHash: event.transaction_hash,
          },
          update: {
            isActive: true,
            enrolledAt: new Date(event.ledger_closed_at),
          },
        });

        console.log(`[Webhook] Merchant enrolled: ${merchant}`);
        return { processed: true, type: 'merchant_enrolled' };
      }

      case EVENT_TYPES.MERCHANT_STATUS: {
        // Merchant address is in topics[1]
        const merchantAddress = values[0];
        if (!merchantAddress) return { processed: false, error: 'No merchant address in topics' };

        await prismaPostgres.parsedMerchant.update({
          where: { address: merchantAddress },
          data: {
            updatedAt: new Date(),
          },
        });

        console.log(`[Webhook] Merchant status updated: ${merchantAddress}`);
        return { processed: true, type: 'merchant_status' };
      }

      default:
        // Unknown event type - skip but don't error
        return { processed: false, error: `Unknown event type: ${eventType}` };
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[Webhook] Error processing event ${event.id}:`, errorMessage);
    return { processed: false, error: errorMessage };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Goldsky sends array of events
    const events: GoldskyEvent[] = Array.isArray(body) ? body : [body];

    console.log(`[Webhook] Received ${events.length} events`);

    const results = await Promise.all(events.map(processEvent));

    const processed = results.filter(r => r.processed).length;
    const failed = results.filter(r => !r.processed && r.error !== 'Unknown event type: init');

    console.log(`[Webhook] Processed: ${processed}, Skipped/Failed: ${results.length - processed}`);

    // Goldsky expects the same data back (for handler transforms)
    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/indexer/webhook',
    description: 'Goldsky event handler webhook',
  });
}
