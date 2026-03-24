import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { ReviewRatingReactionType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prismaHasReviewRatingReactions } from "@/lib/prisma";
import { reactionTypeAsPgEnum } from "@/lib/reviewRatingReactionSql";
import {
  reviewRatingReactionTableExists,
  ReviewRatingReactionsMigrationError,
} from "@/lib/reviewRatingReactionTable";
import type { RatingReactionDetailResponse } from "@/lib/reviewRatingReactions";

/**
 * Toggle / set / clear a rating reaction. Uses the Prisma delegate when present;
 * otherwise falls back to raw SQL (works when the DB is migrated but the client is stale).
 */
export async function applyReviewRatingReaction(
  client: PrismaClient,
  reviewId: string,
  userId: string,
  reactionType: ReviewRatingReactionType
): Promise<void> {
  if (prismaHasReviewRatingReactions(client)) {
    try {
      const existing = await client.reviewRatingReaction.findUnique({
        where: { reviewId_userId: { reviewId, userId } },
      });

      if (existing?.reactionType === reactionType) {
        await client.reviewRatingReaction.delete({
          where: { reviewId_userId: { reviewId, userId } },
        });
      } else if (existing) {
        await client.reviewRatingReaction.update({
          where: { reviewId_userId: { reviewId, userId } },
          data: { reactionType },
        });
      } else {
        await client.reviewRatingReaction.create({
          data: { reviewId, userId, reactionType },
        });
      }
      return;
    } catch (e) {
      console.warn(
        "[applyReviewRatingReaction] delegate failed, using SQL fallback",
        e
      );
    }
  }

  if (!(await reviewRatingReactionTableExists(client))) {
    throw new ReviewRatingReactionsMigrationError();
  }

  const existing = await client.$queryRaw<{ id: string; reactionType: string }[]>(
    Prisma.sql`SELECT id, "reactionType"::text AS "reactionType" FROM "ReviewRatingReaction" WHERE "reviewId" = ${reviewId} AND "userId" = ${userId} LIMIT 1`
  );
  const row = existing[0];

  if (row?.reactionType === reactionType) {
    await client.$executeRaw(
      Prisma.sql`DELETE FROM "ReviewRatingReaction" WHERE id = ${row.id}`
    );
  } else if (row) {
    await client.$executeRaw(
      Prisma.sql`UPDATE "ReviewRatingReaction" SET "reactionType" = ${reactionTypeAsPgEnum(reactionType)}, "updatedAt" = NOW() WHERE id = ${row.id}`
    );
  } else {
    const id = randomUUID();
    await client.$executeRaw(
      Prisma.sql`INSERT INTO "ReviewRatingReaction" ("id", "reviewId", "userId", "reactionType", "createdAt", "updatedAt") VALUES (${id}, ${reviewId}, ${userId}, ${reactionTypeAsPgEnum(reactionType)}, NOW(), NOW())`
    );
  }
}

const emptyDetail = (): RatingReactionDetailResponse => ({
  totalCount: 0,
  tooLowUsers: [],
  aboutRightUsers: [],
  tooHighUsers: [],
});

export async function fetchReviewRatingReactionDetail(
  client: PrismaClient,
  reviewId: string
): Promise<RatingReactionDetailResponse> {
  try {
    if (prismaHasReviewRatingReactions(client)) {
      try {
        const rows = await client.reviewRatingReaction.findMany({
          where: { reviewId },
          include: {
            user: {
              select: { id: true, handle: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        const tooLowUsers: RatingReactionDetailResponse["tooLowUsers"] = [];
        const aboutRightUsers: RatingReactionDetailResponse["aboutRightUsers"] =
          [];
        const tooHighUsers: RatingReactionDetailResponse["tooHighUsers"] = [];

        for (const r of rows) {
          const u = {
            id: r.user.id,
            handle: r.user.handle,
            name: r.user.name,
            image: r.user.image,
          };
          if (r.reactionType === "TOO_LOW") tooLowUsers.push(u);
          else if (r.reactionType === "ABOUT_RIGHT") aboutRightUsers.push(u);
          else tooHighUsers.push(u);
        }

        return {
          totalCount: rows.length,
          tooLowUsers,
          aboutRightUsers,
          tooHighUsers,
        };
      } catch (e) {
        console.warn(
          "[fetchReviewRatingReactionDetail] delegate failed, using SQL fallback",
          e
        );
      }
    }

    if (!(await reviewRatingReactionTableExists(client))) {
      return emptyDetail();
    }

    const rows = await client.$queryRaw<
      {
        reactionType: string;
        uid: string;
        handle: string | null;
        name: string | null;
        image: string | null;
      }[]
    >(
      Prisma.sql`SELECT r."reactionType"::text AS "reactionType", u.id AS "uid", u.handle, u.name, u.image FROM "ReviewRatingReaction" r INNER JOIN "User" u ON u.id = r."userId" WHERE r."reviewId" = ${reviewId} ORDER BY r."createdAt" ASC`
    );

    const tooLowUsers: RatingReactionDetailResponse["tooLowUsers"] = [];
    const aboutRightUsers: RatingReactionDetailResponse["aboutRightUsers"] = [];
    const tooHighUsers: RatingReactionDetailResponse["tooHighUsers"] = [];

    for (const r of rows) {
      const u = {
        id: r.uid,
        handle: r.handle,
        name: r.name,
        image: r.image,
      };
      if (r.reactionType === "TOO_LOW") tooLowUsers.push(u);
      else if (r.reactionType === "ABOUT_RIGHT") aboutRightUsers.push(u);
      else if (r.reactionType === "TOO_HIGH") tooHighUsers.push(u);
    }

    return {
      totalCount: rows.length,
      tooLowUsers,
      aboutRightUsers,
      tooHighUsers,
    };
  } catch (e) {
    console.warn(
      "[fetchReviewRatingReactionDetail] falling back to empty (table missing or DB error)",
      e
    );
    return emptyDetail();
  }
}
