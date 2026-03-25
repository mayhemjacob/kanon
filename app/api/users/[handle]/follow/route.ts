import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { NotificationType } from "@prisma/client";

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle: handleParam } = await params;
  const handleSlug = normalizeHandle(handleParam);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ following: false });
  }

  const targetUser = await prisma.user.findUnique({
    where: { handle: handleSlug },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json({ following: false });
  }

  if (targetUser.id === session.user.id) {
    return NextResponse.json({ following: false });
  }

  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: targetUser.id,
      },
    },
  });

  return NextResponse.json({ following: !!follow });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { handle: handleParam } = await params;
  const handleSlug = normalizeHandle(handleParam);

  const targetUser = await prisma.user.findUnique({
    where: { handle: handleSlug },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  if (targetUser.id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot follow yourself" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: targetUser.id,
        },
      },
    });

    if (existing) {
      await prisma.follow.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ following: false });
    }

    await prisma.follow.create({
      data: {
        followerId: session.user.id,
        followingId: targetUser.id,
      },
    });

    // Notify target user (only on newly created follow, never self).
    try {
      const actorRow = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { handle: true },
      });
      const actorHandle = actorRow?.handle ?? null;
      const actorLabel = actorHandle ? actorHandle.replace(/^@/, "") : "Someone";
      const href = actorHandle ? `/profile/${actorHandle}` : `/profile/${handleSlug}`;
      await createNotification({
        userId: targetUser.id,
        actorId: session.user.id,
        type: NotificationType.NEW_FOLLOWER,
        text: `${actorLabel} started following you`,
        href,
      });
    } catch {
      // Do not block follow on notification failures.
    }

    return NextResponse.json({ following: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not update follow state" },
      { status: 500 }
    );
  }
}
