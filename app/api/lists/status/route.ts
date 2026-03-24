import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export type ListStatus = { saved: boolean };

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json(
      { error: "Missing ids query parameter" },
      { status: 400 },
    );
  }

  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) return NextResponse.json({});

  const savedListClient = (prisma as unknown as { savedList?: { findMany: Function } }).savedList;
  const rows: Array<{ listId: string }> = savedListClient?.findMany
    ? ((await savedListClient.findMany({
        where: { userId: session.user.id, listId: { in: ids } },
        select: { listId: true },
      })) as Array<{ listId: string }>)
    : await prisma
        .$queryRaw<Array<{ listId: string }>>`
          SELECT "listId"
          FROM "SavedList"
          WHERE "userId" = ${session.user.id}
            AND "listId" IN (${Prisma.join(ids)})
        `
        .catch(() => []);
  const savedSet = new Set(rows.map((r) => r.listId));

  const result: Record<string, ListStatus> = {};
  for (const id of ids) {
    result[id] = { saved: savedSet.has(id) };
  }
  return NextResponse.json(result);
}
