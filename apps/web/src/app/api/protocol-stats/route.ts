import { NextRequest, NextResponse } from 'next/server';
import { prismaPostgres } from '@/lib/prisma-postgres';
import CONTRACT_IDS from '@/config/contracts';

// Current BNPL contract ID for filtering
const BNPL_CONTRACT_ID = CONTRACT_IDS.BNPL_CORE;

/**
 * GET /api/protocol-stats
 *
 * Get protocol statistics (latest snapshot + optional history).
 *
 * Query params:
 * - history: boolean - Include historical data for graphs
 * - period: '24h' | '7d' | '30d' | '90d' | 'all' - History period (default: 7d)
 *
 * Response:
 * {
 *   current: ProtocolSnapshot,
 *   history?: ProtocolSnapshot[] (hourly snapshots)
 * }
 */

type Period = '24h' | '7d' | '30d' | '90d' | 'all';

function getPeriodDate(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return null;
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

function serializeSnapshot(snapshot: Record<string, unknown>) {
  const serialized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (typeof value === 'bigint') {
      serialized[key] = value.toString();
    } else if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else if (value && typeof value === 'object' && 'toNumber' in value) {
      // Prisma Decimal
      serialized[key] = (value as { toNumber: () => number }).toNumber();
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const period = (searchParams.get('period') || '7d') as Period;

    // Get latest snapshot for current contract
    const latest = await prismaPostgres.protocolSnapshot.findFirst({
      where: { contractId: BNPL_CONTRACT_ID },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      return NextResponse.json({
        success: true,
        current: null,
        message: 'No snapshots available yet. Cron job may not have run.',
      });
    }

    const response: {
      success: boolean;
      current: Record<string, unknown>;
      history?: Array<Record<string, unknown>>;
      meta?: {
        historyPeriod: string;
        historyCount: number;
      };
    } = {
      success: true,
      current: serializeSnapshot(latest as unknown as Record<string, unknown>),
    };

    // Get historical snapshots for graphs
    if (includeHistory) {
      const periodStart = getPeriodDate(period);

      const history = await prismaPostgres.protocolSnapshot.findMany({
        where: {
          contractId: BNPL_CONTRACT_ID,
          ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        // Limit to reasonable amount for graphs
        take: period === 'all' ? 1000 : undefined,
      });

      response.history = history.map((s) =>
        serializeSnapshot(s as unknown as Record<string, unknown>)
      );
      response.meta = {
        historyPeriod: period,
        historyCount: history.length,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching protocol stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch protocol stats', details: String(error) },
      { status: 500 }
    );
  }
}
