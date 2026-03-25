import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReviewRatingReactionsMigrationError } from "@/lib/reviewRatingReactionTable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getReviewRatingReactionSummary } from "@/lib/getReviewRatingReactionSummary";
import { isRatingReactionType } from "@/lib/reviewRatingReactions";
import { applyReviewRatingReaction } from "@/lib/reviewRatingReactionsPersistence";
import { createNotification } from "@/lib/notifications";
import { NotificationEntityType, NotificationType } from "@prisma/client";

function titleCaseReaction(reactionType: string): string {
  if (reactionType === "TOO_LOW") return "Too Low";
  if (reactionType === "ABOUT_RIGHT") return "About Right";
  if (reactionType === "TOO_HIGH") return "Too High";
  return reactionType;
}

function actorLabel(handle: string | null): string {
  return handle ? handle.replace(/^@/, "") : "Someone";
}

function formatRating(r: number): string {
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reviewId } = await params;
  const session = await getServerSession(authOptions);

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const summary = await getReviewRatingReactionSummary(
    reviewId,
    session?.user?.id
  );
  return NextResponse.json(summary);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reviewId } = await params;
  const body = await req.json().catch(() => ({}));
  const reactionType = body?.reactionType;

  if (!isRatingReactionType(reactionType)) {
    return NextResponse.json(
      { error: "Invalid reaction type" },
      { status: 400 }
    );
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const userId = session.user.id;

  try {
    await applyReviewRatingReaction(prisma, reviewId, userId, reactionType);

    // Notify the review author (never self).
    try {
      const [reviewRow, actorRow] = await Promise.all([
        prisma.review.findUnique({
          where: { id: reviewId },
          select: {
            id: true,
            userId: true,
            itemId: true,
            rating: true,
            item: { select: { title: true } },
          },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { handle: true },
        }),
      ]);

      if (reviewRow && reviewRow.userId !== userId) {
        const href = `/items/${reviewRow.itemId}/reviews/${reviewRow.id}`;
        const text = `${actorLabel(actorRow?.handle ?? null)} reacted '${titleCaseReaction(
          reactionType
        )}' to your ${formatRating(Number(reviewRow.rating))} for ${reviewRow.item.title}`;

        await createNotification({
          userId: reviewRow.userId,
          actorId: userId,
          type: NotificationType.REVIEW_RATING_REACTION,
          entityType: NotificationEntityType.REVIEW,
          entityId: reviewRow.id,
          text,
          href,
        });
      }
    } catch {
      // Do not block the reaction flow on notification failures.
    }

    const summary = await getReviewRatingReactionSummary(reviewId, userId);
    return NextResponse.json(summary);
  } catch (err) {
    if (err instanceof ReviewRatingReactionsMigrationError) {
      return NextResponse.json(
        { error: err.message, code: "REACTIONS_MIGRATION_REQUIRED" },
        { status: 503 }
      );
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2021" ||
        (err.code === "P2010" &&
          /does not exist|42P01|ReviewRatingReaction/i.test(
            String((err.meta as { message?: string } | undefined)?.message ?? "")
          )))
    ) {
      return NextResponse.json(
        {
          error:
            "Reactions need a DB migration: `npx prisma migrate dev`, or paste `prisma/migrations/20260324190000_add_review_rating_reactions/migration.sql` in Supabase SQL Editor.",
          code: "REACTIONS_MIGRATION_REQUIRED",
        },
        { status: 503 }
      );
    }
    console.error("[POST /api/reviews/[id]/rating-reactions]", err);
    return NextResponse.json(
      { error: "Could not save reaction" },
      { status: 500 }
    );
  }
}
