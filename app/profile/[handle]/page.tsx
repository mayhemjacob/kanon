import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { notFound } from "next/navigation";
import { ProfileByHandleClient, type ProfileData } from "./ProfileByHandleClient";
import type { ProfileListPreview } from "@/app/profile/components/ProfileListCard";

/** First batch of RATED grid reviews (newest first). Matches /profile cap; no load-more yet. */
const PROFILE_REVIEWS_INITIAL_LIMIT = 40;

type ProfileListQueryRow = {
  id: string;
  title: string;
  description: string | null;
  _count: { items: number };
  items: Array<{
    id: string;
    item: {
      id: string;
      imageUrl: string | null;
      type: "FILM" | "SHOW" | "BOOK";
      title: string;
    };
  }>;
};

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

async function loadHandleProfileListsOrEmpty(
  userId: string,
  isOwnProfile: boolean,
): Promise<ProfileListQueryRow[]> {
  const listClient = (prisma as unknown as { list?: { findMany: Function } }).list;
  if (!listClient?.findMany) return [];
  try {
    const rows = await listClient.findMany({
      where: isOwnProfile
        ? { ownerId: userId }
        : { ownerId: userId, visibility: "PUBLIC" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        _count: { select: { items: true } },
        items: {
          orderBy: { position: "asc" },
          take: 4,
          select: {
            id: true,
            item: {
              select: { id: true, imageUrl: true, type: true, title: true },
            },
          },
        },
      },
    });
    return rows as ProfileListQueryRow[];
  } catch {
    return [];
  }
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

  const lists = await loadHandleProfileListsOrEmpty(targetUser.id, isOwnProfile);

  const viewerHandleRow =
    !isOwnProfile && session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { handle: true },
        })
      : null;

  /** Slug for /match/[viewer]/[viewed]; null if guest or viewer has no handle yet */
  const viewerHandleSlug = viewerHandleRow?.handle ?? null;

  const profileLists: ProfileListPreview[] = lists.map((list) => ({
    id: list.id,
    title: list.title,
    description: list.description ?? null,
    itemCount: list._count.items,
    previewItems: list.items.map((row) => ({
      id: row.item.id,
      imageUrl: row.item.imageUrl ?? null,
      type: row.item.type,
      title: row.item.title,
    })),
  }));

  const profile: ProfileData = {
    handle: `@${targetUser.handle}`,
    bio: targetUser.bio ?? null,
    image: targetUser.image ?? null,
    followers: targetUser._count.followers,
    following: targetUser._count.following,
    cards,
    lists: profileLists,
    followingByMe: !!followRow,
    isOwnProfile,
    viewerHandleSlug,
  };

  return <ProfileByHandleClient profile={profile} />;
}
