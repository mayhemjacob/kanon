import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

/** First batch for /saved (newest saved first). No load-more yet. */
const SAVED_ITEMS_INITIAL_LIMIT = 40;

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

  const saved = await prisma.savedItem.findMany({
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

  return NextResponse.json(
    saved.map((s) => ({
      id: s.id,
      itemId: s.item.id,
      title: s.item.title,
      type: s.item.type,
      year: s.item.year,
      imageUrl: s.item.imageUrl ?? null,
    }))
  );
}
