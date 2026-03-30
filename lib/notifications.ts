import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { NotificationEntityType, NotificationType } from "@prisma/client";

export type NotificationActorSummary = {
  id: string;
  handle: string | null;
  image: string | null;
};

export type NotificationInboxItem = {
  id: string;
  type: NotificationType;
  text: string;
  href: string;
  createdAt: string;
  readAt: string | null;
  actor: NotificationActorSummary | null;
};

function toIso(d: Date): string {
  return d.toISOString();
}

function isMissingNotificationTableError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2021: table/view does not exist
    if (err.code === "P2021") return true;
    // P2010 can wrap "relation does not exist" depending on adapter/query path
    if (
      err.code === "P2010" &&
      /does not exist|42P01|Notification/i.test(
        String((err.meta as { message?: string } | undefined)?.message ?? "")
      )
    ) {
      return true;
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /relation .*Notification.* does not exist|42P01/i.test(msg);
}

function isConnectionPoolTimeoutError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Unable to check out connection from the pool due to timeout/i.test(
    msg
  );
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  text: string;
  href: string;
  actorId?: string | null;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
}): Promise<void> {
  const actorId = input.actorId ?? null;
  if (actorId && actorId === input.userId) return;

  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        text: input.text,
        href: input.href,
        actorId,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });
  } catch (err) {
    if (isMissingNotificationTableError(err)) return;
    throw err;
  }
}

export async function getNotificationsForUser(
  userId: string,
  opts?: { limit?: number }
): Promise<NotificationInboxItem[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);

  let rows: Array<{
    id: string;
    type: NotificationType;
    text: string;
    href: string;
    createdAt: Date;
    readAt: Date | null;
    actor: { id: string; handle: string | null; image: string | null } | null;
  }> = [];

  try {
    rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        text: true,
        href: true,
        createdAt: true,
        readAt: true,
        actor: {
          select: { id: true, handle: true, image: true },
        },
      },
    });
  } catch (err) {
    if (isMissingNotificationTableError(err)) return [];
    if (isConnectionPoolTimeoutError(err)) return [];
    throw err;
  }

  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    text: n.text,
    href: n.href,
    createdAt: toIso(n.createdAt),
    readAt: n.readAt ? toIso(n.readAt) : null,
    actor: n.actor
      ? {
          id: n.actor.id,
          handle: n.actor.handle,
          image: n.actor.image,
        }
      : null,
  }));
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({ where: { userId, readAt: null } });
  } catch (err) {
    if (isMissingNotificationTableError(err)) return 0;
    if (isConnectionPoolTimeoutError(err)) return 0;
    throw err;
  }
}

export async function markNotificationRead(input: {
  userId: string;
  notificationId: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_found" | "forbidden" }> {
  const row = await prisma.notification.findUnique({
    where: { id: input.notificationId },
    select: { id: true, userId: true, readAt: true },
  });
  if (!row) return { ok: false, reason: "not_found" };
  if (row.userId !== input.userId) return { ok: false, reason: "forbidden" };
  if (row.readAt) return { ok: true };

  await prisma.notification.update({
    where: { id: row.id },
    data: { readAt: new Date() },
  });

  return { ok: true };
}

