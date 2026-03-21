import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { notFound } from "next/navigation";
import { ProfileByHandleClient, type ProfileData } from "./ProfileByHandleClient";

/** First batch of RATED grid reviews (newest first). Matches /profile cap; no load-more yet. */
const PROFILE_REVIEWS_INITIAL_LIMIT = 40;

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

export default async function ProfileByHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: handleParam } = await params;
  const handleSlug = normalizeHandle(handleParam);

  const [targetUser, session] = await Promise.all([
    prisma.user.findUnique({
      where: { handle: handleSlug },
      select: {
        id: true,
        handle: true,
        bio: true,
        image: true,
        _count: {
          select: { followers: true, following: true },
        },
      },
    }),
    getServerSession(authOptions),
  ]);

  if (!targetUser || !targetUser.handle) {
    notFound();
  }

  const [reviews, followRow] = await Promise.all([
    prisma.review.findMany({
      where: { userId: targetUser.id },
      select: {
        id: true,
        itemId: true,
        rating: true,
        createdAt: true,
        item: {
          select: { type: true, title: true, imageUrl: true, year: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: PROFILE_REVIEWS_INITIAL_LIMIT,
    }),
    session?.user?.id && session.user.id !== targetUser.id
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.user.id,
              followingId: targetUser.id,
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const cards = reviews.map((r) => ({
    id: r.id,
    itemId: r.itemId,
    reviewId: r.id,
    type: r.item.type,
    rating: r.rating,
    title: r.item.title,
    imageUrl: r.item.imageUrl ?? null,
    createdAt: r.createdAt,
    year: r.item.year ?? null,
  }));

  const isOwnProfile = Boolean(
    session?.user?.id && session.user.id === targetUser.id
  );

  const viewerHandleRow =
    !isOwnProfile && session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { handle: true },
        })
      : null;

  /** Slug for /clash/[viewer]/[viewed]; null if guest or viewer has no handle yet */
  const viewerHandleSlug = viewerHandleRow?.handle ?? null;

  const profile: ProfileData = {
    handle: `@${targetUser.handle}`,
    bio: targetUser.bio ?? null,
    image: targetUser.image ?? null,
    followers: targetUser._count.followers,
    following: targetUser._count.following,
    cards,
    followingByMe: !!followRow,
    isOwnProfile,
    viewerHandleSlug,
  };

  return <ProfileByHandleClient profile={profile} />;
}
