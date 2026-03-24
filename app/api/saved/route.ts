import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

/** First batch for /saved (newest saved first). No load-more yet. */
const SAVED_ITEMS_INITIAL_LIMIT = 40;
const SAVED_LISTS_INITIAL_LIMIT = 40;

function getSavedListClient() {
  return (prisma as unknown as { savedList?: { findMany: Function } }).savedList;
}

type PrismaSavedListRow = {
  id: string;
  list: {
    id: string;
    title: string;
    description: string | null;
    owner: { handle: string | null; name: string | null };
    _count: { items: number };
    items: Array<{
      item: { id: string; imageUrl: string | null; type: string; title: string };
    }>;
  };
};

type RawSavedListRow = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  ownerHandle: string | null;
  ownerName: string | null;
  itemCount: bigint;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    session.user.id != null
      ? { id: session.user.id }
      : session.user.email
      ? { email: session.user.email }
      : null;
  if (!where) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where,
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const savedListClient = getSavedListClient();
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

  const savedLists: Array<PrismaSavedListRow | RawSavedListRow> = savedListClient?.findMany
    ? ((await savedListClient.findMany({
        where: { userId: user.id },
        include: {
          list: {
            select: {
              id: true,
              title: true,
              description: true,
              visibility: true,
              owner: {
                select: { handle: true, name: true },
              },
              _count: {
                select: { items: true },
              },
              items: {
                orderBy: { position: "asc" },
                take: 2,
                select: {
                  item: {
                    select: {
                      id: true,
                      imageUrl: true,
                      type: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: SAVED_LISTS_INITIAL_LIMIT,
      })) as PrismaSavedListRow[])
    : await prisma
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

  const isPrismaSavedListRow = savedLists.some((row: PrismaSavedListRow | RawSavedListRow) => "list" in row);
  const rawSavedLists: RawSavedListRow[] = isPrismaSavedListRow
    ? []
    : (savedLists as RawSavedListRow[]);
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
    lists: savedLists.map((s) =>
      "list" in s
        ? {
            id: s.id,
            listId: s.list.id,
            title: s.list.title,
            description: s.list.description ?? null,
            itemCount: s.list._count.items,
            ownerHandle: s.list.owner.handle ?? null,
            ownerName: s.list.owner.name ?? null,
            previewItems: s.list.items.map((row) => ({
              id: row.item.id,
              imageUrl: row.item.imageUrl ?? null,
              type: row.item.type,
              title: row.item.title,
            })),
          }
        : {
            id: s.id,
            listId: s.listId,
            title: s.title,
            description: s.description ?? null,
            itemCount: Number(s.itemCount ?? 0),
            ownerHandle: s.ownerHandle ?? null,
            ownerName: s.ownerName ?? null,
            previewItems: previewByListId.get(s.listId) ?? [],
          },
    ),
  });
}
