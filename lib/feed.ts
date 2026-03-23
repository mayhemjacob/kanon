import type { HomeReview } from "@/app/HomePageClient";
import type { ItemStatus } from "@/app/api/items/status/route";
import { formatTimeAgo } from "@/lib/date";
import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";


/** First-load batch size for `/api/feed` (no load-more yet). */
const HOME_FEED_INITIAL_LIMIT = 15;

/** Max characters for home-card body preview (matches Home card line-clamp behavior). */
const HOME_BODY_PREVIEW_CHARS = 120;

type FeedRow = {
  id: string;
  itemId: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  user_handle: string | null;
  user_name: string | null;
  user_email: string | null;
  user_image: string | null;
  item_type: string;
  item_title: string;
  item_imageurl: string | null;
  item_year: number | null;
  saved: boolean;
  reviewed: boolean;
  my_review_id: string | null;
};

/*
 * Home feed (single round-trip, no N+1):
 * - Restrict to reviews whose author is someone the viewer follows via INNER JOIN Follow
 *   (same as WHERE userId IN (SELECT followingId ...), often friendlier to the planner).
 * - ORDER BY + LIMIT use @@index([userId, createdAt(sort: Desc)]) on Review for
 *   bitmap/merge plans over followees; Follow rows are found via @@unique([followerId, followingId]).
 * - SavedItem / self-join Review use @@unique([userId, itemId]) on those tables.
 *
 * Cache key must include `userId` (personalized feed). Image URLs are normalized (https upgrade,
 * drop data/blob/huge strings) so the serialized cache stays under Next.js’s ~2MB limit.
 */
export async function getHomeFeed(
  userId: string,
): Promise<{ reviews: HomeReview[]; initialStatus: Record<string, ItemStatus> }> {
  return unstable_cache(
    async (): Promise<{
      reviews: HomeReview[];
      initialStatus: Record<string, ItemStatus>;
    }> => {
    const rows = await prisma.$queryRaw<FeedRow[]>`
    SELECT
      r.id,
      r."itemId",
      r.rating,
      CASE
        WHEN r.body IS NULL THEN NULL
        WHEN char_length(r.body) <= ${HOME_BODY_PREVIEW_CHARS}::integer THEN r.body
        ELSE LEFT(r.body, ${HOME_BODY_PREVIEW_CHARS}::integer) || '…'
      END AS body,
      r."createdAt",
      u.handle    AS user_handle,
      u.name     AS user_name,
      u.email    AS user_email,
      u.image    AS user_image,
      i.type     AS item_type,
      i.title    AS item_title,
      i."imageUrl" AS item_imageurl,
      i.year     AS item_year,
      (s."itemId" IS NOT NULL) AS saved,
      (r2."itemId" IS NOT NULL) AS reviewed,
      r2.id AS my_review_id
    FROM "Review" r
    INNER JOIN "Follow" f
      ON f."followingId" = r."userId"
      AND f."followerId" = ${userId}
    INNER JOIN "User" u ON r."userId" = u.id
    INNER JOIN "Item" i ON r."itemId" = i.id
    LEFT JOIN "SavedItem" s ON s."userId" = ${userId} AND s."itemId" = r."itemId"
    LEFT JOIN "Review" r2 ON r2."userId" = ${userId} AND r2."itemId" = r."itemId"
    ORDER BY r."createdAt" DESC
    LIMIT ${HOME_FEED_INITIAL_LIMIT}
  `;

    const reviews: HomeReview[] = [];
    const initialStatus: Record<string, ItemStatus> = {};

    for (const row of rows) {
      const handle = row.user_handle ?? row.user_name ?? row.user_email ?? "user";
      const userName = handle.startsWith("@") ? handle.slice(1) : handle;
      const avatarInitial = (userName[0] ?? row.user_email?.[0] ?? "U").toUpperCase();

      const review: HomeReview = {
        id: row.id,
        itemId: row.itemId,
        userName,
        avatarInitial,
        userImage: normalizeItemImageUrlForNext(row.user_image, {
          omitDataAndBlob: true,
        }),
        rating: row.rating,
        itemType: row.item_type as "FILM" | "SHOW" | "BOOK",
        itemImageUrl: normalizeItemImageUrlForNext(row.item_imageurl, {
          omitDataAndBlob: true,
        }),
        title: row.item_title,
        body: row.body ?? null,
        timeAgo: formatTimeAgo(row.createdAt),
        createdAt: row.createdAt,
        year: row.item_year ?? null,
      };
      reviews.push(review);

      initialStatus[row.itemId] = {
        saved: !!row.saved,
        reviewed: !!row.reviewed,
        ...(row.my_review_id && { reviewId: row.my_review_id }),
      };
    }

    return { reviews, initialStatus };
    },
    ["feed", userId],
    { revalidate: 10 },
  )();
}
