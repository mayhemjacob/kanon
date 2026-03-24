import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;
  const id = listId?.trim();
  if (!id) {
    return NextResponse.json({ error: "List id is required" }, { status: 400 });
  }

  const list = await prisma.list.findUnique({
    where: { id },
    select: { id: true, ownerId: true, visibility: true },
  });
  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  if (list.visibility !== "PUBLIC" && list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const savedListClient = (prisma as unknown as {
    savedList?: { findUnique: Function; delete: Function; create: Function };
  }).savedList;
  if (savedListClient?.findUnique && savedListClient.delete && savedListClient.create) {
    const existing = await savedListClient.findUnique({
      where: {
        userId_listId: {
          userId: session.user.id,
          listId: id,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await savedListClient.delete({ where: { id: existing.id } });
      return NextResponse.json({ saved: false });
    }

    await savedListClient.create({
      data: {
        userId: session.user.id,
        listId: id,
      },
    });
    return NextResponse.json({ saved: true });
  }

  // Fallback for stale Prisma Client generation: use SQL directly.
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SavedList" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "listId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SavedList_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "SavedList_userId_listId_key"
      ON "SavedList" ("userId", "listId")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SavedList_userId_createdAt_idx"
      ON "SavedList" ("userId", "createdAt" DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SavedList_listId_idx"
      ON "SavedList" ("listId")
    `);

    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "SavedList"
      WHERE "userId" = ${session.user.id} AND "listId" = ${id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM "SavedList"
        WHERE "id" = ${existing[0].id}
      `;
      return NextResponse.json({ saved: false });
    }

    await prisma.$executeRaw`
      INSERT INTO "SavedList" ("id", "userId", "listId", "createdAt")
      VALUES (${randomUUID()}, ${session.user.id}, ${id}, NOW())
      ON CONFLICT ("userId", "listId") DO NOTHING
    `;
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "Save lists is not available yet" }, { status: 503 });
  }
}
