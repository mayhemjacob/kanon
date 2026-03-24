import { Prisma } from "@prisma/client";
import type { ReviewRatingReactionType } from "@prisma/client";
import { prisma, prismaHasReviewRatingReactions } from "@/lib/prisma";
import { reviewRatingReactionTableExists } from "@/lib/reviewRatingReactionTable";
import type { RatingReactionSummary } from "@/lib/reviewRatingReactions";
import { isRatingReactionType } from "@/lib/reviewRatingReactions";

async function summaryViaDelegate(
  reviewId: string,
  userId?: string | null
): Promise<RatingReactionSummary> {
  const [grouped, mineRow] = await Promise.all([
    prisma.reviewRatingReaction.groupBy({
      by: ["reactionType"],
      where: { reviewId },
      _count: { _all: true },
    }),
    userId
      ? prisma.reviewRatingReaction.findUnique({
          where: { reviewId_userId: { reviewId, userId } },
          select: { reactionType: true },
        })
      : Promise.resolve(null),
  ]);

  let tooLowCount = 0;
  let aboutRightCount = 0;
  let tooHighCount = 0;
  for (const row of grouped) {
    const n = row._count._all;
    if (row.reactionType === "TOO_LOW") tooLowCount = n;
    else if (row.reactionType === "ABOUT_RIGHT") aboutRightCount = n;
    else if (row.reactionType === "TOO_HIGH") tooHighCount = n;
  }

  return {
    tooLowCount,
    aboutRightCount,
    tooHighCount,
    currentUserReaction: mineRow?.reactionType ?? null,
  };
}

/** When the delegate is missing or errors, but the table exists. */
async function summaryViaSql(
  reviewId: string,
  userId?: string | null
): Promise<RatingReactionSummary> {
  const grouped = await prisma.$queryRaw<{ reactionType: string; cnt: bigint }[]>(
    Prisma.sql`SELECT "reactionType"::text AS "reactionType", COUNT(*)::bigint AS cnt FROM "ReviewRatingReaction" WHERE "reviewId" = ${reviewId} GROUP BY "reactionType"`
  );

  let tooLowCount = 0;
  let aboutRightCount = 0;
  let tooHighCount = 0;
  for (const row of grouped) {
    const n = Number(row.cnt);
    if (row.reactionType === "TOO_LOW") tooLowCount = n;
    else if (row.reactionType === "ABOUT_RIGHT") aboutRightCount = n;
    else if (row.reactionType === "TOO_HIGH") tooHighCount = n;
  }

  let currentUserReaction: ReviewRatingReactionType | null = null;
  if (userId) {
    const mine = await prisma.$queryRaw<{ reactionType: string }[]>(
      Prisma.sql`SELECT "reactionType"::text AS "reactionType" FROM "ReviewRatingReaction" WHERE "reviewId" = ${reviewId} AND "userId" = ${userId} LIMIT 1`
    );
    const raw = mine[0]?.reactionType;
    currentUserReaction = isRatingReactionType(raw) ? raw : null;
  }

  return {
    tooLowCount,
    aboutRightCount,
    tooHighCount,
    currentUserReaction,
  };
}

const emptySummary: RatingReactionSummary = {
  tooLowCount: 0,
  aboutRightCount: 0,
  tooHighCount: 0,
  currentUserReaction: null,
};

export async function getReviewRatingReactionSummary(
  reviewId: string,
  userId?: string | null
): Promise<RatingReactionSummary> {
  if (prismaHasReviewRatingReactions(prisma)) {
    try {
      return await summaryViaDelegate(reviewId, userId);
    } catch (e) {
      console.warn(
        "[getReviewRatingReactionSummary] delegate failed, using SQL fallback",
        e
      );
    }
  }

  if (!(await reviewRatingReactionTableExists(prisma))) {
    return emptySummary;
  }

  try {
    return await summaryViaSql(reviewId, userId);
  } catch (e) {
    console.warn(
      "[getReviewRatingReactionSummary] reactions unavailable (apply migrations?)",
      e
    );
    return emptySummary;
  }
}
