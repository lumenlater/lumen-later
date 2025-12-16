import { NextRequest, NextResponse } from 'next/server';
import { eventIndexer } from '@/services/event-indexer.service';

/**
 * GET /api/indexer/events
 *
 * Query indexed contract events from PostgreSQL.
 *
 * Query Parameters:
 * - contractId: Filter by contract address
 * - txHash: Filter by transaction hash
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 * - startDate: Filter events after this date (ISO 8601)
 * - endDate: Filter events before this date (ISO 8601)
 */
export async function GET(request: NextRequest) {
  try {
    if (!eventIndexer.isConfigured()) {
      return NextResponse.json(
        { error: 'PostgreSQL not configured. Set POSTGRES_URL in .env' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const options = {
      contractId: searchParams.get('contractId') || undefined,
      txHash: searchParams.get('txHash') || undefined,
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 200),
      offset: parseInt(searchParams.get('offset') || '0'),
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
    };

    const result = await eventIndexer.getEvents(options);

    // Convert BigInt to string for JSON serialization
    const serializedEvents = result.events.map(e => ({
      ...e,
      ledgerSequence: e.ledgerSequence.toString(),
    }));

    return NextResponse.json({
      ...result,
      events: serializedEvents,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
