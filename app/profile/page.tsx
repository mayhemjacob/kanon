import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import ProfilePageClient, {
  type ProfileState,
  type ReviewCard,
} from "./ProfilePageClient";

/** First batch of RATED grid reviews (newest first). No load-more yet. */
const PROFILE_REVIEWS_INITIAL_LIMIT = 40;

const emptyProfile: ProfileState = {
  handle: null,
  image: null,
  bio: null,
  followers: null,
  following: null,
};

type UserSelect = {
  id: string;
  handle: string | null;
  image: string | null;
  bio?: string | null;
  _count: { followers: number; following: number };
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  const where =
    session?.user?.id != null
      ? { id: session.user.id }
      : session?.user?.email
        ? { email: session.user.email }
        : null;

  if (!where) {
    return (
      <ProfilePageClient initialProfile={emptyProfile} initialCards={[]} />
    );
  }

  let user: UserSelect | null = null;

  try {
    user = (await prisma.user.findUnique({
      where,
      select: {
        id: true,
        handle: true,
        image: true,
        bio: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    })) as UserSelect | null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("bio") ||
      msg.includes("Unknown column") ||
      msg.includes("does not exist")
    ) {
      user = (await prisma.user.findUnique({
        where,
        select: {
          id: true,
          handle: true,
          image: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
        },
      })) as UserSelect | null;
    } else {
      throw err;
    }
  }

  if (!user) {
    return (
      <ProfilePageClient initialProfile={emptyProfile} initialCards={[]} />
    );
  }

  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
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
  });

  const initialCards: ReviewCard[] = reviews.map((r) => ({
    id: r.id,
    itemId: r.itemId,
    reviewId: r.id,
    type: r.item.type,
    rating: Number(r.rating),
    title: r.item.title,
    imageUrl: r.item.imageUrl ?? null,
    createdAt: r.createdAt.toISOString(),
    year: r.item.year ?? null,
  }));

  const initialProfile: ProfileState = {
    handle: user.handle ?? null,
    image: user.image ?? null,
    bio: "bio" in user ? (user.bio ?? null) : null,
    followers: user._count.followers,
    following: user._count.following,
  };

  return (
    <ProfilePageClient
      initialProfile={initialProfile}
      initialCards={initialCards}
    />
  );
}
