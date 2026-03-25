import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { NotificationEntityType, NotificationType } from "@prisma/client";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { itemId, rating, body: text } = body ?? {};

  if (!itemId || typeof rating !== "number") {
    return NextResponse.json(
      { error: "Missing itemId or rating" },
      { status: 400 },
    );
  }

  const num = Number(rating);
  if (Number.isNaN(num) || num < 1 || num > 10) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 10" },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.review.findUnique({
      where: { userId_itemId: { userId: session.user.id, itemId } },
      select: { id: true },
    });

    const review = existing
      ? await prisma.review.update({
          where: { id: existing.id },
          data: {
            rating: num,
            body: text ?? null,
          },
        })
      : await prisma.review.create({
          data: {
            userId: session.user.id,
            itemId,
            rating: num,
            body: text ?? null,
          },
        });

    // Only create FOLLOWING_USER_NEW_REVIEW notifications on first publish.
    if (!existing) {
      try {
        const [followers, actorRow, itemRow] = await Promise.all([
          prisma.follow.findMany({
            where: { followingId: session.user.id },
            select: { followerId: true },
          }),
          prisma.user.findUnique({
            where: { id: session.user.id },
            select: { handle: true },
          }),
          prisma.item.findUnique({
            where: { id: itemId },
            select: { title: true },
          }),
        ]);

        const actorHandle = actorRow?.handle ?? null;
        const actorLabel = actorHandle ? actorHandle.replace(/^@/, "") : "Someone";
        const itemTitle = itemRow?.title ?? "an item";
        const href = `/items/${itemId}/reviews/${review.id}`;

        const recipientIds = Array.from(
          new Set(
            followers
              .map((f) => f.followerId)
              .filter((id) => id && id !== session.user.id)
          )
        );

        if (recipientIds.length > 0) {
          await prisma.notification.createMany({
            data: recipientIds.map((recipientId) => ({
              userId: recipientId,
              actorId: session.user.id,
              type: NotificationType.FOLLOWING_USER_NEW_REVIEW,
              entityType: NotificationEntityType.REVIEW,
              entityId: review.id,
              text: `${actorLabel} published a review of ${itemTitle}`,
              href,
              createdAt: new Date(),
            })),
          });
        }
      } catch {
        // Do not block review creation on notification failures.
      }
    }

    return NextResponse.json(review);
  } catch (err) {
    return NextResponse.json(
      { error: "Could not save review" },
      { status: 500 },
    );
  }
}

