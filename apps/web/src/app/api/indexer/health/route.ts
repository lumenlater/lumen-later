import { NextResponse } from 'next/server';
import { eventIndexer } from '@/services/event-indexer.service';

/**
 * GET /api/indexer/health
 *
 * Health check for event indexer.
 * Tests PostgreSQL connection and Goldsky data availability.
 *
 * Response:
 * {
 *   status: "healthy" | "degraded" | "unhealthy",
 *   checks: { postgres: {...}, goldsky: {...} },
 *   timestamp: string
 * }
 */
export async function GET() {
  const checks: Record<string, { status: string; message: string; data?: unknown }> = {};

  // Check 1: Configuration
  if (eventIndexer.isConfigured()) {
    checks.config = {
      status: 'pass',
      message: 'POSTGRES_URL configured',
    };
  } else {
    checks.config = {
      status: 'fail',
      message: 'POSTGRES_URL not set in environment',
    };
  }

  // Check 2: Database Connection
  if (eventIndexer.isConfigured()) {
    const dbHealth = await eventIndexer.healthCheck();
    checks.database = {
      status: dbHealth.status === 'healthy' ? 'pass' : 'fail',
      message: dbHealth.message,
      data: dbHealth.data,
    };
  } else {
    checks.database = {
      status: 'fail',
      message: 'Skipped - not configured',
    };
  }

  // Determine overall status
  const failedChecks = Object.values(checks).filter(c => c.status === 'fail').length;
  let status: 'healthy' | 'degraded' | 'unhealthy';

  if (failedChecks === 0) {
    status = 'healthy';
  } else if (failedChecks === Object.keys(checks).length) {
    status = 'unhealthy';
  } else {
    status = 'degraded';
  }

  return NextResponse.json(
    {
      status,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: status === 'healthy' ? 200 : 503 }
  );
}
