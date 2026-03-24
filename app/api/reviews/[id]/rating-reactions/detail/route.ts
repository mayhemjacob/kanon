import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchReviewRatingReactionDetail } from "@/lib/reviewRatingReactionsPersistence";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reviewId } = await params;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const payload = await fetchReviewRatingReactionDetail(prisma, reviewId);
  return NextResponse.json(payload);
}
