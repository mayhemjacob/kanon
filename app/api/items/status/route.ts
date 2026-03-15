import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export type ItemStatus = { saved: boolean; reviewed: boolean; reviewId?: string };

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
      { status: 400 }
    );
  }

  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({});
  }

  const userId = session.user.id;

  const [savedRows, reviewRows] = await Promise.all([
    prisma.savedItem.findMany({
      where: { userId, itemId: { in: ids } },
      select: { itemId: true },
    }),
    prisma.review.findMany({
      where: { userId, itemId: { in: ids } },
      select: { itemId: true, id: true },
    }),
  ]);

  const savedSet = new Set(savedRows.map((r) => r.itemId));
  const reviewByItem = new Map(reviewRows.map((r) => [r.itemId, r.id]));

  const result: Record<string, ItemStatus> = {};
  for (const id of ids) {
    const reviewId = reviewByItem.get(id);
    result[id] = {
      saved: savedSet.has(id),
      reviewed: !!reviewId,
      ...(reviewId && { reviewId }),
    };
  }

  return NextResponse.json(result);
}
