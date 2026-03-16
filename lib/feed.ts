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

async function getHomeFeedUncached(
  userId: string
): Promise<{ reviews: HomeReview[]; initialStatus: Record<string, ItemStatus> }> {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  if (followingIds.length === 0) {
    return { reviews: [], initialStatus: {} };
  }

  const reviewsData = await prisma.review.findMany({
    where: { userId: { in: followingIds } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      user: { select: { handle: true, name: true, email: true, image: true } },
      item: { select: { type: true, title: true, imageUrl: true, year: true } },
    },
  });

  const itemIds = [...new Set(reviewsData.map((r) => r.itemId))];

  const [savedRows, myReviews] = await Promise.all([
    prisma.savedItem.findMany({
      where: { userId, itemId: { in: itemIds } },
      select: { itemId: true },
    }),
    prisma.review.findMany({
      where: { userId, itemId: { in: itemIds } },
      select: { itemId: true, id: true },
    }),
  ]);

  const savedSet = new Set(savedRows.map((s) => s.itemId));
  const reviewByItem = new Map(myReviews.map((r) => [r.itemId, r.id]));

  const reviews: HomeReview[] = [];
  const initialStatus: Record<string, ItemStatus> = {};

  for (const r of reviewsData) {
    const handle = r.user?.handle ?? r.user?.name ?? r.user?.email ?? "user";
    const userName = String(handle).startsWith("@") ? String(handle).slice(1) : String(handle);
    const avatarInitial = (userName[0] ?? r.user?.email?.[0] ?? "U").toUpperCase();
    const reviewId = reviewByItem.get(r.itemId);
    const img = r.user?.image;
    const userImage = img && !img.startsWith("data:") ? img : null;

    reviews.push({
      id: r.id,
      itemId: r.itemId,
      userName,
      avatarInitial,
      userImage,
      rating: r.rating,
      itemType: r.item.type as "FILM" | "SHOW" | "BOOK",
      itemImageUrl: r.item.imageUrl?.startsWith("data:") ? null : (r.item.imageUrl ?? null),
      title: r.item.title,
      tags: [],
      body: r.body ?? null,
      timeAgo: timeAgo(r.createdAt),
      createdAt: r.createdAt,
      year: r.item.year ?? null,
    });

    initialStatus[r.itemId] = {
      saved: savedSet.has(r.itemId),
      reviewed: !!reviewId,
      ...(reviewId && { reviewId }),
    };
  }

  return { reviews, initialStatus };
}

export async function getHomeFeed(
  userId: string
): Promise<{ reviews: HomeReview[]; initialStatus: Record<string, ItemStatus> }> {
  return getHomeFeedUncached(userId);
}
