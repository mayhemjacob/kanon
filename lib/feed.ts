import { prisma } from "@/lib/prisma";
import type { HomeReview } from "@/app/HomePageClient";
import type { ItemStatus } from "@/app/api/items/status/route";

function timeAgo(from: Date): string {
  const diffMs = Date.now() - from.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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
};

export async function getHomeFeed(
  userId: string
): Promise<{ reviews: HomeReview[]; initialStatus: Record<string, ItemStatus> }> {
  // Single query with LEFT JOINs for status (avoids correlated subqueries)
  const rows = await prisma.$queryRaw<FeedRow[]>`
    WITH following AS (
      SELECT "followingId" FROM "Follow" WHERE "followerId" = ${userId}
    )
    SELECT
      r.id,
      r."itemId",
      r.rating,
      r.body,
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
      (r2."itemId" IS NOT NULL) AS reviewed
    FROM "Review" r
    INNER JOIN "User" u ON r."userId" = u.id
    INNER JOIN "Item" i ON r."itemId" = i.id
    LEFT JOIN "SavedItem" s ON s."userId" = ${userId} AND s."itemId" = r."itemId"
    LEFT JOIN "Review" r2 ON r2."userId" = ${userId} AND r2."itemId" = r."itemId"
    WHERE r."userId" IN (SELECT "followingId" FROM following)
    ORDER BY r."createdAt" DESC
    LIMIT 50
  `;

  const reviews: HomeReview[] = [];
  const initialStatus: Record<string, ItemStatus> = {};

  for (const row of rows) {
    const handle = row.user_handle ?? row.user_name ?? row.user_email ?? "user";
    const userName = handle.startsWith("@") ? handle.slice(1) : handle;
    const avatarInitial = (userName[0] ?? row.user_email?.[0] ?? "U").toUpperCase();

    reviews.push({
      id: row.id,
      itemId: row.itemId,
      userName,
      avatarInitial,
      userImage: row.user_image ?? null,
      rating: row.rating,
      itemType: row.item_type as "FILM" | "SHOW" | "BOOK",
      itemImageUrl: row.item_imageurl ?? null,
      title: row.item_title,
      tags: [],
      body: row.body ?? null,
      timeAgo: timeAgo(row.createdAt),
      createdAt: row.createdAt,
      year: row.item_year ?? null,
    });

    initialStatus[row.itemId] = {
      saved: !!row.saved,
      reviewed: !!row.reviewed,
    };
  }

  return { reviews, initialStatus };
}
