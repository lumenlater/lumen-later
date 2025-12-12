import { NextResponse } from 'next/server';
import { eventIndexer } from '@/services/event-indexer.service';

/**
 * GET /api/indexer/stats
 *
 * Get event indexer statistics.
 *
 * Response:
 * {
 *   totalEvents: number,
 *   eventsByContract: { BNPL_CORE: 10, LP_TOKEN: 5, ... },
 *   latestLedger: string | null,
 *   latestTimestamp: string | null
 * }
 */
export async function GET() {
  try {
    if (!eventIndexer.isConfigured()) {
      return NextResponse.json(
        { error: 'PostgreSQL not configured. Set POSTGRES_URL in .env' },
        { status: 503 }
      );
    }

    const stats = await eventIndexer.getStats();

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        latestLedger: stats.latestLedger?.toString() || null,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
