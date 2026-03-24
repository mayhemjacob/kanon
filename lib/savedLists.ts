import { prisma } from "@/lib/prisma";

function getSavedListClient() {
  return (prisma as unknown as {
    savedList?: { findMany: Function; findUnique: Function };
  }).savedList;
}

export async function loadSavedListIdSet(userId: string, listIds: string[]): Promise<Set<string>> {
  if (!listIds.length) return new Set();

  const savedListClient = getSavedListClient();
  if (savedListClient?.findMany) {
    const rows = await savedListClient.findMany({
      where: { userId, listId: { in: listIds } },
      select: { listId: true },
    });
    return new Set(rows.map((r: { listId: string }) => r.listId));
  }

  const rows = await prisma
    .$queryRaw<Array<{ listId: string }>>`
      SELECT "listId"
      FROM "SavedList"
      WHERE "userId" = ${userId}
    `
    .catch(() => []);

  const targetIds = new Set(listIds);
  return new Set(rows.map((r) => r.listId).filter((id) => targetIds.has(id)));
}

export async function isListSavedByUser(userId: string, listId: string): Promise<boolean> {
  const savedListClient = getSavedListClient();
  if (savedListClient?.findUnique) {
    const row = await savedListClient.findUnique({
      where: { userId_listId: { userId, listId } },
      select: { id: true },
    });
    return Boolean(row);
  }

  const rows = await prisma
    .$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "SavedList"
      WHERE "userId" = ${userId} AND "listId" = ${listId}
      LIMIT 1
    `
    .catch(() => []);
  return rows.length > 0;
}
