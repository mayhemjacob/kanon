import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In development, use a higher connection limit to avoid pool timeouts
// (production/serverless should use connection_limit=1 with a pooler)
function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || process.env.NODE_ENV === "production") return undefined
  // String-based replace to avoid URL parsing issues with special chars in passwords
  let result = url
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

const devUrl = getDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    devUrl
      ? {
          datasources: {
            db: { url: devUrl },
          },
        }
      : undefined
  )

globalForPrisma.prisma = prisma