/**
 * Event Indexer Service
 *
 * Queries contract events from PostgreSQL using Prisma.
 * Events are streamed by Goldsky Mirror pipeline.
 *
 * Architecture:
 *   Goldsky Mirror → PostgreSQL → Prisma → This Service → API
 *
 * @see /indexer/pipeline.yaml - Goldsky pipeline config
 * @see /prisma/schema.postgres.prisma - PostgreSQL schema
 * @see /docs/EVENT_INDEXER.md - Setup documentation
 */

import { prismaPostgres } from '@/lib/prisma-postgres';
import { CONTRACT_IDS } from '../../../../packages/contract-ids';

// Contract ID to name mapping
const CONTRACT_NAMES: Record<string, string> = {
  [CONTRACT_IDS.BNPL_CORE]: 'BNPL_CORE',
  [CONTRACT_IDS.LP_TOKEN]: 'LP_TOKEN',
  [CONTRACT_IDS.USDC_TOKEN]: 'USDC_TOKEN',
};

export interface EventWithName {
  id: string;
  contractId: string;
  contractName: string;
  topic: unknown;
  data: unknown;
  ledger: bigint;
  txHash: string;
  eventTimestamp: Date;
}

export interface EventStats {
  totalEvents: number;
  eventsByContract: Record<string, number>;
  latestLedger: bigint | null;
  latestEventTimestamp: Date | null;
}

export interface EventQueryOptions {
  contractId?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  txHash?: string;
}

export class EventIndexerService {
  private prisma = prismaPostgres;

  /**
   * Check if PostgreSQL is configured
   */
  isConfigured(): boolean {
    return !!process.env.POSTGRES_URL;
  }

  /**
   * Health check - test database connection
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    data?: unknown;
  }> {
    if (!this.isConfigured()) {
      return {
        status: 'unhealthy',
        message: 'POSTGRES_URL not configured',
      };
    }

    try {
      const count = await this.prisma.contractEvent.count();
      const latest = await this.prisma.contractEvent.findFirst({
        orderBy: { ledger: 'desc' },
        select: { ledger: true, eventTimestamp: true },
      });

      return {
        status: 'healthy',
        message: 'PostgreSQL connected via Prisma',
        data: {
          totalEvents: count,
          latestLedger: latest?.ledger?.toString() || null,
          latestEventTimestamp: latest?.eventTimestamp || null,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Get events with filters
   */
  async getEvents(options: EventQueryOptions = {}): Promise<{
    events: EventWithName[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const {
      contractId,
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      txHash,
    } = options;

    const where: any = {};

    if (contractId) where.contractId = contractId;
    if (txHash) where.txHash = txHash;
    if (startDate || endDate) {
      where.eventTimestamp = {};
      if (startDate) where.eventTimestamp.gte = startDate;
      if (endDate) where.eventTimestamp.lte = endDate;
    }

    const [events, total] = await Promise.all([
      this.prisma.contractEvent.findMany({
        where,
        orderBy: { eventTimestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.contractEvent.count({ where }),
    ]);

    const eventsWithName: EventWithName[] = events.map(e => ({
      id: e.id,
      contractId: e.contractId,
      contractName: CONTRACT_NAMES[e.contractId] || 'UNKNOWN',
      topic: e.topic,
      data: e.data,
      ledger: e.ledger,
      txHash: e.txHash,
      eventTimestamp: e.eventTimestamp,
    }));

    return { events: eventsWithName, total, limit, offset };
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<EventWithName | null> {
    const event = await this.prisma.contractEvent.findUnique({
      where: { id },
    });

    if (!event) return null;

    return {
      id: event.id,
      contractId: event.contractId,
      contractName: CONTRACT_NAMES[event.contractId] || 'UNKNOWN',
      topic: event.topic,
      data: event.data,
      ledger: event.ledger,
      txHash: event.txHash,
      eventTimestamp: event.eventTimestamp,
    };
  }

  /**
   * Get events by transaction hash
   */
  async getEventsByTxHash(txHash: string): Promise<EventWithName[]> {
    const events = await this.prisma.contractEvent.findMany({
      where: { txHash },
      orderBy: { eventTimestamp: 'asc' },
    });

    return events.map(e => ({
      id: e.id,
      contractId: e.contractId,
      contractName: CONTRACT_NAMES[e.contractId] || 'UNKNOWN',
      topic: e.topic,
      data: e.data,
      ledger: e.ledger,
      txHash: e.txHash,
      eventTimestamp: e.eventTimestamp,
    }));
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<EventStats> {
    const [total, byContract, latest] = await Promise.all([
      this.prisma.contractEvent.count(),
      this.prisma.contractEvent.groupBy({
        by: ['contractId'],
        _count: { _all: true },
      }),
      this.prisma.contractEvent.findFirst({
        orderBy: { ledger: 'desc' },
        select: { ledger: true, eventTimestamp: true },
      }),
    ]);

    const eventsByContract: Record<string, number> = {};
    byContract.forEach(item => {
      const name = CONTRACT_NAMES[item.contractId] || item.contractId;
      eventsByContract[name] = item._count._all;
    });

    return {
      totalEvents: total,
      eventsByContract,
      latestLedger: latest?.ledger || null,
      latestEventTimestamp: latest?.eventTimestamp || null,
    };
  }

  /**
   * Get recent events (for dashboard)
   */
  async getRecentEvents(limit: number = 10): Promise<EventWithName[]> {
    const events = await this.prisma.contractEvent.findMany({
      orderBy: { eventTimestamp: 'desc' },
      take: limit,
    });

    return events.map(e => ({
      id: e.id,
      contractId: e.contractId,
      contractName: CONTRACT_NAMES[e.contractId] || 'UNKNOWN',
      topic: e.topic,
      data: e.data,
      ledger: e.ledger,
      txHash: e.txHash,
      eventTimestamp: e.eventTimestamp,
    }));
  }

  /**
   * Get unique transaction count (for SCF metrics)
   */
  async getTransactionCount(): Promise<number> {
    const result = await this.prisma.contractEvent.groupBy({
      by: ['txHash'],
    });
    return result.length;
  }

  /**
   * Save protocol snapshot (for historical tracking)
   */
  async saveSnapshot(): Promise<void> {
    const stats = await this.getStats();

    await this.prisma.protocolSnapshot.create({
      data: {
        totalEvents: stats.totalEvents,
        bnplCoreEvents: stats.eventsByContract['BNPL_CORE'] || 0,
        lpTokenEvents: stats.eventsByContract['LP_TOKEN'] || 0,
        usdcTokenEvents: stats.eventsByContract['USDC_TOKEN'] || 0,
        latestLedger: stats.latestLedger,
      },
    });
  }
}

// Singleton instance
export const eventIndexer = new EventIndexerService();
export default EventIndexerService;
