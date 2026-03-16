import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { notFound } from "next/navigation";
import { FollowListClient } from "./FollowListClient";

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: handleParam } = await params;
  const handleSlug = normalizeHandle(handleParam);
  const session = await getServerSession(authOptions);

  const targetUser = await prisma.user.findUnique({
    where: { handle: handleSlug },
    select: { id: true },
  });

  if (!targetUser) {
    notFound();
  }

  const followers = await prisma.follow.findMany({
    where: { followingId: targetUser.id },
    include: {
      follower: {
        select: { handle: true, bio: true, image: true, id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let followingByMeMap: Record<string, boolean> = {};
  if (session?.user?.id) {
    const handles = followers
      .map((f) => f.follower.handle)
      .filter((h): h is string => !!h);
    if (handles.length > 0) {
      const follows = await prisma.follow.findMany({
        where: {
          followerId: session.user.id,
          following: { handle: { in: handles } },
        },
        select: { following: { select: { handle: true } } },
      });
      followingByMeMap = follows.reduce(
        (acc, f) => {
          if (f.following.handle) acc[f.following.handle] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
    }
  }

  const users = followers
    .filter((f) => f.follower.handle)
    .map((f) => ({
      handle: f.follower.handle!,
      bio: f.follower.bio,
      image: f.follower.image,
      followingByMe: followingByMeMap[f.follower.handle!] ?? false,
    }));

  const currentUserHandle =
    session?.user?.id
      ? (
          await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { handle: true },
          })
        )?.handle ?? null
      : null;

  return (
    <FollowListClient
      title="Followers"
      users={users}
      backHref={`/profile/${handleSlug}`}
      currentUserHandle={currentUserHandle}
    />
  );
}
