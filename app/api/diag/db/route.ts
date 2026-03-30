import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

function allowedEmails(): Set<string> {
  const raw = process.env.ANALYTICS_ADMIN_EMAILS ?? "jacobo.miralles@gmail.com";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function safeDbUrlInfo(urlRaw: string | undefined) {
  if (!urlRaw) return { present: false };
  try {
    const u = new URL(urlRaw);
    return {
      present: true,
      host: u.host,
      pathname: u.pathname,
      hasPgbouncer: u.searchParams.get("pgbouncer") === "true",
      connectionLimit: u.searchParams.get("connection_limit"),
      poolTimeout: u.searchParams.get("pool_timeout"),
    };
  } catch {
    return { present: true, parseError: true };
  }
}

function errorSummary(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return { code: err.code, message: err.message };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { message };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase() ?? "";
  if (!email || !allowedEmails().has(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const dbUrl = safeDbUrlInfo(process.env.DATABASE_URL);

  const result: Record<string, unknown> = {
    nowIso: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV ?? null,
    dbUrl,
  };

  try {
    const pingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    result.pingMs = Date.now() - pingStart;
  } catch (err) {
    result.pingError = errorSummary(err);
  }

  try {
    const countStart = Date.now();
    const itemCount = await prisma.item.count();
    result.itemCountMs = Date.now() - countStart;
    result.itemCount = itemCount;
  } catch (err) {
    result.itemCountError = errorSummary(err);
  }

  result.totalMs = Date.now() - startedAt;
  return NextResponse.json(result);
}

