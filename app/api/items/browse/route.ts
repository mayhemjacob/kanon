import { prisma } from "@/lib/prisma";
import { ItemType, Prisma } from "@prisma/client";
import {
  DISCOVER_BROWSE_MAX_PAGE,
  DISCOVER_BROWSE_PAGE_SIZE,
} from "@/lib/discoverBrowse";
import { NextResponse } from "next/server";

type ItemWithReviews = Prisma.ItemGetPayload<{ include: { reviews: true } }>;

function isConnectionPoolTimeoutError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2024") {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Unable to check out connection from the pool due to timeout/i.test(msg) ||
    /Timed out fetching a new connection from the connection pool/i.test(msg)
  );
}

function parseTypeFilter(raw: string | null): ItemType | null {
  const t = raw?.trim().toUpperCase();
  if (t === "FILM" || t === "SHOW" || t === "BOOK") return t;
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const rawLimit = parseInt(
    searchParams.get("limit") ?? String(DISCOVER_BROWSE_PAGE_SIZE),
    10,
  );
  const limit = Math.min(
    DISCOVER_BROWSE_MAX_PAGE,
    Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DISCOVER_BROWSE_PAGE_SIZE),
  );
  const typeFilter = parseTypeFilter(searchParams.get("type"));

  let payload: Array<{
    id: string;
    title: string;
    year: number;
    type: ItemType;
    imageUrl: string | null;
    averageRating: number;
    ratingCount: number;
    tags: string[];
  }> = [];
  try {
    const rows: ItemWithReviews[] = await prisma.item.findMany({
      where: typeFilter ? { type: typeFilter } : undefined,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: { reviews: true },
    });

    payload = rows.map((item) => {
      const ratingCount = item.reviews.length;
      const averageRating =
        ratingCount === 0
          ? 0
          : Number(
              (item.reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(
                1,
              ),
            );
      return {
        id: item.id,
        title: item.title,
        year: item.year ?? 0,
        type: item.type,
        imageUrl: item.imageUrl,
        averageRating,
        ratingCount,
        tags: item.tags ?? [],
      };
    });
  } catch (err) {
    if (isConnectionPoolTimeoutError(err)) {
      return NextResponse.json([]);
    }
    throw err;
  }

  return NextResponse.json(payload);
}
