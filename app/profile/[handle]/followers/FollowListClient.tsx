"use client";

import {
  touchIconButtonInnerGhostLgClass,
  touchIconButtonOuterClass,
} from "@/lib/iconButtonTouchTarget";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type UserEntry = {
  handle: string;
  bio: string | null;
  image: string | null;
  followingByMe: boolean;
};

type FollowListClientProps = {
  title: "Followers" | "Following";
  users: UserEntry[];
  backHref: string;
  currentUserHandle?: string | null;
};

export function FollowListClient({
  title,
  users,
  backHref,
  currentUserHandle,
}: FollowListClientProps) {
  const router = useRouter();
  const getHandleSlug = (h: string) => h.replace(/^@/, "");

  const [followState, setFollowState] = useState<Record<string, boolean>>(
    users.reduce(
      (acc, u) => {
        acc[getHandleSlug(u.handle)] = u.followingByMe;
        return acc;
      },
      {} as Record<string, boolean>
    )
  );
  const [loadingHandles, setLoadingHandles] = useState<Set<string>>(new Set());

  const handleFollowToggle = useCallback(
    async (e: React.MouseEvent, handleSlug: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (loadingHandles.has(handleSlug)) return;

      const wasFollowing = followState[handleSlug] ?? false;
      setFollowState((prev) => ({ ...prev, [handleSlug]: !wasFollowing }));
      setLoadingHandles((prev) => new Set(prev).add(handleSlug));

      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(handleSlug)}/follow`,
          { method: "POST" }
        );
        if (res.ok) {
          const data = await res.json();
          setFollowState((prev) => ({ ...prev, [handleSlug]: data.following }));
          router.refresh();
        } else {
          setFollowState((prev) => ({ ...prev, [handleSlug]: wasFollowing }));
        }
      } catch {
        setFollowState((prev) => ({ ...prev, [handleSlug]: wasFollowing }));
      } finally {
        setLoadingHandles((prev) => {
          const next = new Set(prev);
          next.delete(handleSlug);
          return next;
        });
      }
    },
    [followState, loadingHandles]
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:px-6 sm:py-8 sm:pb-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={backHref}
            className={`group ${touchIconButtonOuterClass}`}
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
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </span>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            {title}
          </h1>
        </div>

        <div className="divide-y divide-zinc-100">
          {users.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              No {title.toLowerCase()} yet.
            </p>
          ) : (
            users.map((user) => {
              const handleSlug = getHandleSlug(user.handle);
              const following = followState[handleSlug] ?? user.followingByMe;
              const isCurrentUser =
                currentUserHandle &&
                getHandleSlug(currentUserHandle) === handleSlug;

              return (
                <Link
                  key={handleSlug}
                  href={`/profile/${handleSlug}`}
                  className="flex items-center gap-4 py-4 transition-colors first:pt-0 hover:bg-zinc-50/50 -mx-2 px-2 rounded-lg"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        sizes="48px"
                        unoptimized={
                          user.image.startsWith("data:") ||
                          user.image.startsWith("blob:")
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-base font-semibold text-zinc-500">
                        {(getHandleSlug(user.handle)[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-zinc-900">
                      @{handleSlug}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {user.bio || "No bio yet."}
                    </p>
                  </div>

                  {!isCurrentUser && (
                    <button
                      type="button"
                      onClick={(e) => handleFollowToggle(e, handleSlug)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                        following
                          ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                      }`}
                    >
                      {following ? "Following" : "Follow"}
                    </button>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
