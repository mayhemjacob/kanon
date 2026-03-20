"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTimeAgo } from "@/lib/date";

type SortOption = "reviewDate" | "rating" | "publicationYear";

export type ProfileData = {
  handle: string;
  bio: string | null;
  image: string | null;
  followers: number;
  following: number;
  cards: {
    id: string;
    itemId: string;
    reviewId: string;
    type: string;
    rating: number;
    title: string;
    imageUrl: string | null;
    createdAt: Date;
    year: number | null;
  }[];
  followingByMe: boolean;
};

type Props = {
  profile: ProfileData;
};

export function ProfileByHandleClient({ profile: initialProfile }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialProfile.followingByMe);
  const [followersCount, setFollowersCount] = useState(initialProfile.followers);
  const followBusyRef = useRef(false);

  useEffect(() => {
    setFollowing(initialProfile.followingByMe);
    setFollowersCount(initialProfile.followers);
  }, [initialProfile.followingByMe, initialProfile.followers, initialProfile.handle]);

  const [activeType, setActiveType] = useState<"All" | "Films" | "Series" | "Books">("All");
  const [sortBy, setSortBy] = useState<SortOption>("reviewDate");
  const [sortModalOpen, setSortModalOpen] = useState(false);

  const filteredCards = useMemo(() => {
    let list = initialProfile.cards.filter((card) => {
      if (activeType === "All") return true;
      if (activeType === "Films" && card.type !== "FILM") return false;
      if (activeType === "Series" && card.type !== "SHOW") return false;
      if (activeType === "Books" && card.type !== "BOOK") return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "reviewDate") {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      }
      if (sortBy === "rating") {
        return b.rating - a.rating;
      }
      const aYear = a.year ?? 0;
      const bYear = b.year ?? 0;
      return bYear - aYear;
    });
  }, [initialProfile.cards, activeType, sortBy]);

  const handleFollowToggle = useCallback(async () => {
    if (followBusyRef.current) return;
    const handleSlug = initialProfile.handle.replace(/^@/, "");
    const wasFollowing = following;
    const delta = wasFollowing ? -1 : 1;
    followBusyRef.current = true;
    setFollowing((prev) => !prev);
    setFollowersCount((c) => Math.max(0, c + delta));
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(handleSlug)}/follow`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        if (data.following === wasFollowing) {
          setFollowersCount((c) => Math.max(0, c - delta));
        }
      } else {
        setFollowing(wasFollowing);
        setFollowersCount((c) => Math.max(0, c - delta));
      }
    } catch {
      setFollowing(wasFollowing);
      setFollowersCount((c) => Math.max(0, c - delta));
    } finally {
      followBusyRef.current = false;
    }
  }, [initialProfile.handle, following]);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] space-y-6 md:pb-8">
        <div className="-mt-2 -mx-2 mb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center h-10 w-10 rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Go back"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <header className="text-center space-y-2">
          <div className="mx-auto h-20 w-20 rounded-full overflow-hidden bg-zinc-200">
            {initialProfile.image ? (
              <img src={initialProfile.image} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="text-sm font-semibold">{initialProfile.handle}</div>
          <p className="text-sm text-zinc-600">{initialProfile.bio || "No bio yet."}</p>
          <div className="mt-3 flex items-center justify-center gap-8 text-sm">
            <Link
              href={`/profile/${initialProfile.handle.replace(/^@/, "")}/followers`}
              className="hover:opacity-80 transition-opacity"
            >
              <div className="font-semibold">{followersCount}</div>
              <div className="text-zinc-500 text-xs">Followers</div>
            </Link>
            <Link
              href={`/profile/${initialProfile.handle.replace(/^@/, "")}/following`}
              className="hover:opacity-80 transition-opacity"
            >
              <div className="font-semibold">{initialProfile.following}</div>
              <div className="text-zinc-500 text-xs">Following</div>
            </Link>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleFollowToggle}
              className={`rounded-full px-8 py-2.5 text-sm font-medium transition-colors ${
                following
                  ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          </div>
        </header>

        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              RATED
            </h2>
            <button
              type="button"
              onClick={() => setSortModalOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Sort"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h4M4 12h4M4 18h4" />
                <path d="M12 6h8M12 12h6M12 18h8" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {["All", "Films", "Series", "Books"].map((label) => (
              <button
                key={label}
                className={`rounded-full px-3 py-1 ${
                  activeType === label
                    ? "bg-black text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
                onClick={() =>
                  setActiveType(label as "All" | "Films" | "Series" | "Books")
                }
              >
                {label}
              </button>
            ))}
          </div>

          {sortModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
              <div
                className="absolute inset-0 bg-black/50"
                aria-hidden
                onClick={() => setSortModalOpen(false)}
              />
              <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Sort</h2>
                  <button
                    type="button"
                    onClick={() => setSortModalOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mb-4 text-sm font-medium text-zinc-900">Sort By</p>
                <div className="space-y-2">
                  {[
                    { value: "reviewDate" as const, label: "Review Date", sublabel: "Newest first" },
                    { value: "rating" as const, label: "Rating", sublabel: "Highest first" },
                    { value: "publicationYear" as const, label: "Publication Year", sublabel: "Newest first" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSortBy(opt.value)}
                      className={`flex w-full flex-col items-start rounded-xl px-4 py-3 text-left transition-colors ${
                        sortBy === opt.value
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                      }`}
                    >
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className={`text-xs ${sortBy === opt.value ? "text-zinc-300" : "text-zinc-500"}`}>
                        {opt.sublabel}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-blue-600">
                  Sort your feed by review date, rating, or publication year.
                </p>
                <button
                  type="button"
                  onClick={() => setSortModalOpen(false)}
                  className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-500 mr-1">RATING</span>
            {[10, 9, 8, 7, 6, 5, 4, "≤3"].map((label, i) => (
              <button
                key={label}
                className={`rounded-full px-2.5 py-1 ${
                  i === 0
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 sm:gap-4">
            {initialProfile.cards.length === 0 ? (
              <p className="col-span-2 text-center text-sm text-zinc-500 py-8">No reviews yet.</p>
            ) : (
              filteredCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/items/${card.itemId}/reviews/${card.reviewId}`}
                  className="relative block overflow-hidden rounded-2xl bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-300">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-1.5">
                      <span className="pointer-events-auto rounded-full bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-medium text-white leading-none">
                        {card.type === "SHOW" ? "SERIES" : card.type}
                      </span>
                      <span className="pointer-events-auto rounded-full bg-zinc-900/90 px-2 py-0.5 text-[10px] font-medium text-white">
                        {Number.isInteger(card.rating) ? card.rating : card.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-3">
                    <span className="line-clamp-2 text-sm font-medium text-white">
                      {card.title}
                    </span>
                    <div className="mt-0.5 text-[11px] text-white/80">
                      {formatTimeAgo(card.createdAt)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
