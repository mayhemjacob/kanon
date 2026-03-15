import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

export type ProfileCard = {
  id: string;
  itemId: string;
  reviewId: string;
  type: string;
  rating: number;
  title: string;
  imageUrl: string | null;
};

export type GetProfileResponse = {
  handle: string;
  bio: string | null;
  image: string | null;
  followers: number;
  following: number;
  cards: ProfileCard[];
  followingByMe: boolean;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle: handleParam } = await params;
  const handleSlug = normalizeHandle(handleParam);

  const targetUser = await prisma.user.findUnique({
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
  });

  if (!targetUser || !targetUser.handle) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [reviews, followRow] = await Promise.all([
    prisma.review.findMany({
      where: { userId: targetUser.id },
      select: {
        id: true,
        itemId: true,
        rating: true,
        item: {
          select: { type: true, title: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    (async () => {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id || session.user.id === targetUser.id) return null;
      return prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: targetUser.id,
          },
        },
      });
    })(),
  ]);

  const cards: ProfileCard[] = reviews.map((r) => ({
    id: r.id,
    itemId: r.itemId,
    reviewId: r.id,
    type: r.item.type,
    rating: r.rating,
    title: r.item.title,
    imageUrl: r.item.imageUrl ?? null,
  }));

  const followingByMe = !!followRow;

  const response: GetProfileResponse = {
    handle: `@${targetUser.handle}`,
    bio: targetUser.bio ?? null,
    image: targetUser.image ?? null,
    followers: targetUser._count.followers,
    following: targetUser._count.following,
    cards,
    followingByMe,
  };

  return NextResponse.json(response);
}
