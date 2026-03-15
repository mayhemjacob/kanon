import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reviewId } = await params;

  const body = await req.json().catch(() => ({}));
  const { rating, body: text } = body ?? {};

  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: { rating?: number; body?: string | null } = {};

  if (typeof rating === "number") {
    const num = Number(rating);
    if (Number.isNaN(num) || num < 1 || num > 10) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 10" },
        { status: 400 }
      );
    }
    updates.rating = Math.round(num * 10) / 10;
  }

  if (text !== undefined) {
    updates.body = typeof text === "string" ? (text.trim() || null) : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(existing);
  }

  try {
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: updates,
    });
    return NextResponse.json(review);
  } catch (err) {
    console.error("[PATCH /api/reviews/[id]]", err);
    return NextResponse.json(
      { error: "Could not update review" },
      { status: 500 }
    );
  }
}
