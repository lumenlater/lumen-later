/**
 * Prisma Client for PostgreSQL (Event Indexer)
 *
 * Separate Prisma client for event data stored in PostgreSQL.
 * Events are streamed by Goldsky Mirror pipeline.
 *
 * Setup:
 *   1. Set POSTGRES_URL in .env
 *   2. Run: npx prisma generate --schema=prisma/schema.postgres.prisma
 *   3. Run: npx prisma db push --schema=prisma/schema.postgres.prisma
 */

import { PrismaClient } from '@prisma/client-postgres';

declare global {
  // eslint-disable-next-line no-var
  var prismaPostgres: PrismaClient | undefined;
}

const prismaPostgres = global.prismaPostgres || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prismaPostgres = prismaPostgres;
}

export { prismaPostgres };
export default prismaPostgres;
