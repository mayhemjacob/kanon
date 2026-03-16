import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { notFound } from "next/navigation";
import { FollowListClient } from "../followers/FollowListClient";

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: handleParam } = await params;
  const handleSlug = normalizeHandle(handleParam ?? "");
  if (!handleSlug) notFound();

  const session = await getServerSession(authOptions);

  const targetUser = await prisma.user.findUnique({
    where: { handle: handleSlug },
    select: { id: true },
  });

  if (!targetUser) {
    notFound();
  }

  const following = await prisma.follow.findMany({
    where: { followerId: targetUser.id },
    include: {
      following: {
        select: { handle: true, bio: true, image: true, id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let followingByMeMap: Record<string, boolean> = {};
  if (session?.user?.id) {
    const handles = following
      .map((f) => f.following.handle)
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

  const users = following
    .filter((f) => f.following.handle)
    .map((f) => ({
      handle: f.following.handle!,
      bio: f.following.bio,
      image: f.following.image,
      followingByMe: followingByMeMap[f.following.handle!] ?? false,
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

  // Back to /profile (has tab bar) when viewing own profile, else /profile/[handle]
  const isOwnProfile =
    currentUserHandle && currentUserHandle.toLowerCase() === handleSlug;
  const backHref = isOwnProfile ? "/profile" : `/profile/${handleSlug}`;

  return (
    <FollowListClient
      title="Following"
      users={users}
      backHref={backHref}
      currentUserHandle={currentUserHandle}
    />
  );
}
