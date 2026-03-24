import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Supabase transaction pooler + Prisma need `pgbouncer=true` or raw/prepared queries
 * often fail with P2010. See:
 * https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#postgresql-extensions-for-connection-pooling
 */
function getConfiguredDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return undefined

  let result = url

  if (
    /pooler\.supabase\.com/i.test(result) &&
    !/[?&]pgbouncer=true\b/i.test(result)
  ) {
    result += (result.includes("?") ? "&" : "?") + "pgbouncer=true"
  }

  if (process.env.NODE_ENV === "production") {
    return result
  }

  if (result.includes("connection_limit=")) {
    result = result.replace(/connection_limit=\d+/i, "connection_limit=10")
  } else {
    result += (result.includes("?") ? "&" : "?") + "connection_limit=10"
  }
  if (!result.includes("connect_timeout=")) {
    result += "&connect_timeout=30"
  }
  return result
}

const configuredUrl = getConfiguredDatabaseUrl()

function createPrismaClient(): PrismaClient {
  return new PrismaClient(
    configuredUrl
      ? {
          datasources: {
            db: { url: configuredUrl },
          },
        }
      : undefined
  )
}

export function prismaHasReviewRatingReactions(client: PrismaClient): boolean {
  return (
    typeof (client as unknown as { reviewRatingReaction?: { groupBy: unknown } })
      .reviewRatingReaction?.groupBy === "function"
  )
}

/**
 * Reuse a cached PrismaClient only if it includes all current schema delegates.
 * Otherwise Next/webpack hot reload can keep a singleton from before `prisma generate`,
 * where e.g. `reviewRatingReaction` is missing and any access throws.
 */
function resolvePrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma
  if (existing && prismaHasReviewRatingReactions(existing)) {
    return existing
  }

  const fresh = createPrismaClient()
  globalForPrisma.prisma = fresh

  return fresh
}

export const prisma = resolvePrismaClient()
