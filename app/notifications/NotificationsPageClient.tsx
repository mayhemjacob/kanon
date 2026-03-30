"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { formatTimeAgo } from "@/lib/date";
import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";
import type { NotificationInboxItem } from "@/lib/notifications";
import {
  touchIconButtonInnerGhostLgClass,
  touchIconButtonOuterClass,
} from "@/lib/iconButtonTouchTarget";

function actorLabel(handle: string | null): string {
  return handle ? handle.replace(/^@/, "") : "Someone";
}

export function NotificationsPageClient({
  initialItems,
}: {
  initialItems: NotificationInboxItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationInboxItem[]>(initialItems);
  const [failedAvatarIds, setFailedAvatarIds] = useState<Set<string>>(new Set());

  const hasAny = items.length > 0;

  const handleClick = useCallback(
    async (e: React.MouseEvent, item: NotificationInboxItem) => {
      // Allow new-tab, etc.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();

      if (!item.readAt) {
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row
          )
        );
        try {
          await fetch(`/api/notifications/${encodeURIComponent(item.id)}/read`, {
            method: "POST",
          });
        } catch {
          // keep optimistic state
        }
      }

      router.push(item.href);
    },
    [router]
  );

  const rendered = useMemo(() => {
    return items.map((n) => {
      const actor = n.actor;
      const avatarSrc = actor?.image
        ? normalizeItemImageUrlForNext(actor.image)
        : null;
      const showAvatarImage = !!avatarSrc && !failedAvatarIds.has(n.id);
      const isUnread = !n.readAt;

      return (
        <li key={n.id}>
          <Link
            href={n.href}
            onClick={(e) => handleClick(e, n)}
            className={`group flex w-full items-start gap-3 rounded-2xl px-3 py-3 transition-colors ${
              isUnread ? "bg-zinc-50" : "bg-white"
            } hover:bg-zinc-100 active:bg-zinc-100`}
            aria-label={n.text}
          >
            <div className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200">
              {showAvatarImage ? (
                <Image
                  src={avatarSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="36px"
                  unoptimized
                  onError={() =>
                    setFailedAvatarIds((prev) => {
                      const next = new Set(prev);
                      next.add(n.id);
                      return next;
                    })
                  }
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-600">
                  {actor ? actorLabel(actor.handle).slice(0, 1).toUpperCase() : "•"}
                </div>
              )}
              {isUnread ? (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-zinc-900 ring-2 ring-white" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div
                className={`text-sm leading-snug ${
                  isUnread ? "text-zinc-900" : "text-zinc-700"
                }`}
              >
                <span className="line-clamp-2">{n.text}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {formatTimeAgo(n.createdAt)}
              </div>
            </div>
          </Link>
        </li>
      );
    });
  }, [items, handleClick, failedAvatarIds]);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8 md:pb-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className={touchIconButtonOuterClass}
            aria-label="Back"
          >
            <span className={touchIconButtonInnerGhostLgClass}>
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </span>
          </button>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Notifications
          </h1>
        </div>

        {!hasAny ? (
          <div className="mt-10 rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-8 text-center">
            <p className="text-sm text-zinc-600">
              Here you’ll see reactions, follows, and relevant activity from
              people you follow.
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">{rendered}</ul>
        )}
      </div>
    </main>
  );
}

