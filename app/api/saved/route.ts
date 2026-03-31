import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

/** First batch for /saved (newest saved first). No load-more yet. */
const SAVED_ITEMS_INITIAL_LIMIT = 40;
const SAVED_LISTS_INITIAL_LIMIT = 40;

type RawSavedListRow = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  ownerHandle: string | null;
  ownerName: string | null;
  itemCount: bigint;
};

function isTransientPoolSaturation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /MaxClientsInSessionMode: max clients reached/i.test(msg) ||
    /Unable to check out connection from the pool due to timeout/i.test(msg) ||
    /Timed out fetching a new connection from the connection pool/i.test(msg) ||
    /P2024/i.test(msg)
  );
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId: string | null =
      typeof session.user.id === "string" && session.user.id.trim()
        ? session.user.id
        : null;

    if (!userId && typeof session.user.email === "string" && session.user.email.trim()) {
      const byEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      userId = byEmail?.id ?? null;
    }

    if (!userId) {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      }).catch(() => null);
      if (typeof token?.sub === "string" && token.sub.trim()) {
        userId = token.sub;
      }
    }

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const savedItems = await prisma.savedItem.findMany({
      where: { userId: user.id },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            type: true,
            year: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: SAVED_ITEMS_INITIAL_LIMIT,
    });

    // Use join-based query to avoid Prisma relation crashes on orphan SavedList rows.
    const savedLists = await prisma
      .$queryRaw<Array<RawSavedListRow>>`
      SELECT
        sl."id" AS "id",
        l."id" AS "listId",
        l."title" AS "title",
        l."description" AS "description",
        u."handle" AS "ownerHandle",
        u."name" AS "ownerName",
        (
          SELECT COUNT(*)::bigint
          FROM "ListItem" li
          WHERE li."listId" = l."id"
        ) AS "itemCount"
      FROM "SavedList" sl
      JOIN "List" l ON l."id" = sl."listId"
      JOIN "User" u ON u."id" = l."ownerId"
      WHERE sl."userId" = ${user.id}
      ORDER BY sl."createdAt" DESC
      LIMIT ${SAVED_LISTS_INITIAL_LIMIT}
    `
      .catch(() => []);

    const rawSavedLists: RawSavedListRow[] = savedLists;
    const previewByListId = new Map<
      string,
      Array<{ id: string; imageUrl: string | null; type: string; title: string }>
    >();

    if (rawSavedLists.length > 0) {
      const listIds = rawSavedLists.map((row) => row.listId);
      const previewRows = await prisma
        .$queryRaw<
          Array<{
            listId: string;
            itemId: string;
            imageUrl: string | null;
            type: string;
            title: string;
          }>
        >`
        SELECT x."listId", x."itemId", x."imageUrl", x."type", x."title"
        FROM (
          SELECT
            li."listId" AS "listId",
            i."id" AS "itemId",
            i."imageUrl" AS "imageUrl",
            i."type"::text AS "type",
            i."title" AS "title",
            ROW_NUMBER() OVER (PARTITION BY li."listId" ORDER BY li."position" ASC) AS rn
          FROM "ListItem" li
          JOIN "Item" i ON i."id" = li."itemId"
          WHERE li."listId" IN (${Prisma.join(listIds)})
        ) AS x
        WHERE x.rn <= 2
        ORDER BY x."listId", x.rn
      `
        .catch(() => []);

      for (const row of previewRows) {
        const prev = previewByListId.get(row.listId) ?? [];
        prev.push({
          id: row.itemId,
          imageUrl: row.imageUrl ?? null,
          type: row.type,
          title: row.title,
        });
        previewByListId.set(row.listId, prev);
      }
    }

    return NextResponse.json({
      singles: savedItems.map((s) => ({
        id: s.id,
        itemId: s.item.id,
        title: s.item.title,
        type: s.item.type,
        year: s.item.year,
        imageUrl: s.item.imageUrl ?? null,
      })),
      lists: savedLists.map((s) => ({
        id: s.id,
        listId: s.listId,
        title: s.title,
        description: s.description ?? null,
        itemCount: Number(s.itemCount ?? 0),
        ownerHandle: s.ownerHandle ?? null,
        ownerName: s.ownerName ?? null,
        previewItems: previewByListId.get(s.listId) ?? [],
      })),
    });
  } catch (err) {
    if (isTransientPoolSaturation(err)) {
      return NextResponse.json(
        { error: "Service temporarily busy. Please retry." },
        { status: 503 },
      );
    }
    throw err;
  }
}
