"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ItemStatus = { saved: boolean; reviewed: boolean };

const reviews = [
  {
    id: "1",
    itemId: "1",
    userName: "alexchen",
    avatarInitial: "A",
    rating: 9.2,
    itemType: "FILM",
    title: "Dune: Part Two",
    tags: ["Sci-Fi", "Adventure", "Drama"],
    body: "Visually stunning. Made me feel small in the best way possible.",
    timeAgo: "2h ago",
  },
  {
    id: "2",
    itemId: "2",
    userName: "sarahkim",
    avatarInitial: "S",
    rating: 9.8,
    itemType: "SHOW",
    title: "The Bear",
    tags: ["Drama", "Comedy", "Contemporary"],
    body: "Intense and beautiful. Every frame felt like controlled chaos.",
    timeAgo: "5h ago",
  },
  {
    id: "3",
    itemId: "3",
    userName: "mikej",
    avatarInitial: "M",
    rating: 8.5,
    itemType: "FILM",
    title: "Past Lives",
    tags: ["Romance", "Drama"],
    body: "Quiet and affecting. Stuck with me for days.",
    timeAgo: "1d ago",
  },
  {
    id: "4",
    itemId: "4",
    userName: "emilyw",
    avatarInitial: "E",
    rating: 8.1,
    itemType: "BOOK",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    tags: ["Contemporary", "Drama"],
    body: "A beautiful meditation on friendship and creation.",
    timeAgo: "2d ago",
  },
  {
    id: "5",
    itemId: "5",
    userName: "davidl",
    avatarInitial: "D",
    rating: 6.7,
    itemType: "SHOW",
    title: "Succession",
    tags: ["Drama", "Satire"],
    body: "Hooked from the first episode. The writing is sharp.",
    timeAgo: "3d ago",
  },
  {
    id: "6",
    itemId: "6",
    userName: "jessm",
    avatarInitial: "J",
    rating: 6.3,
    itemType: "FILM",
    title: "The Midnight Library",
    tags: ["Fantasy", "Drama"],
    body: "Loved the concept. Some bits dragged but overall satisfying.",
    timeAgo: "4d ago",
  },
  {
    id: "7",
    itemId: "7",
    userName: "chrisp",
    avatarInitial: "C",
    rating: 7.4,
    itemType: "SHOW",
    title: "Severance",
    tags: ["Sci-Fi", "Thriller"],
    body: "One of the most inventive shows in years.",
    timeAgo: "5d ago",
  },
];

const typeOptions = ["All", "Films", "Shows", "Books"] as const;
type TypeFilter = (typeof typeOptions)[number];

type RatingFilterOption = number | "≤3";
const ratingOptions: RatingFilterOption[] = [10, 9, 8, 7, 6, 5, 4, "≤3"];

function ratingMatchesBand(rating: number, band: RatingFilterOption): boolean {
  if (band === "≤3") return rating <= 3;
  return rating >= band && rating < band + 1;
}

export default function Home() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<TypeFilter>("All");
  const [selectedRatingBands, setSelectedRatingBands] = useState<Set<RatingFilterOption>>(new Set());

  const toggleRatingBand = (band: RatingFilterOption) => {
    setSelectedRatingBands((prev) => {
      const next = new Set(prev);
      if (next.has(band)) next.delete(band);
      else next.add(band);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (activeType === "Films" && r.itemType !== "FILM") {
        return false;
      }
      if (activeType === "Shows" && r.itemType !== "SHOW") {
        return false;
      }
      if (activeType === "Books" && r.itemType !== "BOOK") {
        return false;
      }

      if (selectedRatingBands.size === 0) return true;
      return [...selectedRatingBands].some((band) => ratingMatchesBand(r.rating, band));
    });
  }, [activeType, selectedRatingBands]);

  const itemIds = useMemo(() => reviews.map((r) => r.itemId), []);
  const [statusMap, setStatusMap] = useState<Record<string, ItemStatus>>({});

  const fetchStatus = useCallback(async () => {
    if (itemIds.length === 0) return;
    try {
      const res = await fetch(`/api/items/status?ids=${itemIds.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        setStatusMap(data);
      }
    } catch {
      // offline or not logged in
    }
  }, [itemIds.join(",")]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSaveToggle = useCallback(async (itemId: string) => {
    // Optimistic update: highlight immediately
    setStatusMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        saved: !(prev[itemId]?.saved ?? false),
        reviewed: prev[itemId]?.reviewed ?? false,
      },
    }));
    try {
      const res = await fetch(`/api/items/${itemId}/save`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStatusMap((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], saved: data.saved, reviewed: prev[itemId]?.reviewed ?? false },
        }));
      } else {
        // Revert on error (e.g. 401, 500)
        setStatusMap((prev) => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            saved: !(prev[itemId]?.saved ?? false),
            reviewed: prev[itemId]?.reviewed ?? false,
          },
        }));
      }
    } catch {
      setStatusMap((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          saved: !(prev[itemId]?.saved ?? false),
          reviewed: prev[itemId]?.reviewed ?? false,
        },
      }));
    }
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              For you
            </h1>
            <button className="text-xs text-zinc-500">All Time ▾</button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-zinc-500 mr-1">Type</span>
              {typeOptions.map((label) => {
                const isActive = activeType === label;
                return (
                  <button
                    key={label}
                    onClick={() => setActiveType(label)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      isActive
                        ? "bg-black text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-500 mr-1">Rating</span>
              {ratingOptions.map((label) => {
                const isActive = selectedRatingBands.has(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleRatingBand(label)}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <section className="space-y-4 pb-20">
          {filtered.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <Link
                  href={`/profile/${encodeURIComponent(review.userName)}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
                >
                  {review.avatarInitial}
                </Link>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/profile/${encodeURIComponent(review.userName)}`}
                      className="hover:underline"
                    >
                      <div className="text-xs font-medium text-zinc-900">
                        {review.userName}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {review.timeAgo}
                      </div>
                    </Link>
                    <div className="flex items-center gap-4 text-xs text-zinc-400" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`transition-colors hover:text-zinc-700 ${statusMap[review.itemId]?.saved ? "text-zinc-900" : ""}`}
                        aria-label="Save"
                        onClick={() => handleSaveToggle(review.itemId)}
                      >
                        {statusMap[review.itemId]?.saved ? (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
                            <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        className={`transition-colors hover:text-zinc-700 ${statusMap[review.itemId]?.reviewed ? "text-zinc-900" : ""}`}
                        aria-label="Rate"
                        onClick={() => router.push(`/items/${review.itemId}/review`)}
                      >
                        {statusMap[review.itemId]?.reviewed ? (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
                            <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <Link
                    href={`/items/${review.itemId}/reviews/${review.id}`}
                    className="mt-4 grid grid-cols-[auto_1fr] gap-3 items-stretch rounded-lg hover:bg-zinc-50/80 -mx-1 px-1 transition-colors"
                  >
                    {/* Image: fills row height (title→description), keeps 2:3 proportion; column width from content */}
                    <div className="h-full overflow-hidden rounded-lg">
                      <div className="h-full min-w-[3.5rem] rounded-lg overflow-hidden bg-zinc-200 [aspect-ratio:2/3]">
                        <div className="h-full w-full bg-zinc-900 flex items-center justify-center text-[10px] font-medium text-white">
                          {review.itemType}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      {/* 1. Title */}
                      <h2 className="text-sm font-semibold text-zinc-900">
                        {review.title}
                      </h2>
                      {/* 2. Tags (max 3) */}
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                        {review.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {/* 3. Rating */}
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-[32px] font-semibold leading-none tracking-tight text-zinc-900">
                          {Math.floor(review.rating)}
                        </span>
                        {!Number.isInteger(review.rating) && (
                          <span className="text-[17px] font-semibold leading-none tracking-tight text-zinc-900">
                            .{Math.round((review.rating - Math.floor(review.rating)) * 10)}
                          </span>
                        )}
                      </div>
                      {/* 4. Description (character limit; full text on review page) */}
                      <p className="mt-3 text-sm text-zinc-700 line-clamp-2">
                        {review.body && review.body.length > 120
                          ? `${review.body.slice(0, 120).trim()}…`
                          : review.body}
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}