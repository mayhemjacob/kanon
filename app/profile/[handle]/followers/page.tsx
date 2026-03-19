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
  const handleSlug = normalizeHandle(handleParam ?? "");
  if (!handleSlug) notFound();

  const [session, targetUser] = await Promise.all([
    getServerSession(authOptions),
    prisma.user.findUnique({
      where: { handle: handleSlug },
      select: { id: true },
    }),
  ]);

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
  let currentUserHandle: string | null = null;

  if (session?.user?.id) {
    const handles = followers
      .map((f) => f.follower.handle)
      .filter((h): h is string => !!h);
    const [follows, currentUser] = await Promise.all([
      handles.length > 0
        ? prisma.follow.findMany({
            where: {
              followerId: session.user.id,
              following: { handle: { in: handles } },
            },
            select: { following: { select: { handle: true } } },
          })
        : Promise.resolve([]),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { handle: true },
      }),
    ]);
    followingByMeMap = follows.reduce(
      (acc, f) => {
        if (f.following.handle) acc[f.following.handle] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );
    currentUserHandle = currentUser?.handle ?? null;
  }

  const users = followers
    .filter((f) => f.follower.handle)
    .map((f) => ({
      handle: f.follower.handle!,
      bio: f.follower.bio,
      image: f.follower.image,
      followingByMe: followingByMeMap[f.follower.handle!] ?? false,
    }));

  // Back to /profile (has tab bar) when viewing own profile, else /profile/[handle]
  const isOwnProfile =
    currentUserHandle && currentUserHandle.toLowerCase() === handleSlug;
  const backHref = isOwnProfile ? "/profile" : `/profile/${handleSlug}`;

  return (
    <FollowListClient
      title="Followers"
      users={users}
      backHref={backHref}
      currentUserHandle={currentUserHandle}
    />
  );
}
