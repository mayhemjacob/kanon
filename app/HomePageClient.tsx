"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ItemStatus = { saved: boolean; reviewed: boolean; reviewId?: string };

export type HomeReview = {
  id: string;
  itemId: string;
  userName: string;
  avatarInitial: string;
  userImage: string | null;
  rating: number;
  itemType: "FILM" | "SHOW" | "BOOK";
  itemImageUrl: string | null;
  title: string;
  /** Optional; omitted from `/api/feed` (home list has no tags). Offline dev can still set tags. */
  tags?: string[];
  /** From API: short preview only. Full text is on the review page. */
  body: string | null;
  timeAgo: string;
  createdAt: Date; // for sort by review date
  year: number | null; // for sort by publication year
};

const typeOptions = ["All", "Films", "Series", "Books"] as const;
type TypeFilter = (typeof typeOptions)[number];

type SortOption = "reviewDate" | "rating" | "publicationYear";

type RatingFilterOption = number | "≤3";
const ratingOptions: RatingFilterOption[] = [10, 9, 8, 7, 6, 5, 4, "≤3"];

function ratingMatchesBand(rating: number, band: RatingFilterOption): boolean {
  if (band === "≤3") return rating <= 3;
  return rating >= band && rating < band + 1;
}

function FeedSkeleton() {
  return (
    <section className="space-y-4 pb-20">
      {[1, 2, 3].map((i) => (
        <article key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="space-y-1">
                  <div className="h-3 w-16 rounded bg-zinc-200 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-zinc-100 animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-4 w-4 rounded bg-zinc-100 animate-pulse" />
                  <div className="h-4 w-4 rounded bg-zinc-100 animate-pulse" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
                <div className="aspect-[3/4] w-20 rounded-lg bg-zinc-200 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-zinc-200 animate-pulse" />
                  <div className="h-8 w-12 rounded bg-zinc-200 animate-pulse" />
                  <div className="h-4 w-full rounded bg-zinc-100 animate-pulse" />
                  <div className="h-4 w-4/5 rounded bg-zinc-100 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export function HomePageClient({
  reviews: initialReviews,
  initialStatus = {},
}: {
  reviews?: HomeReview[];
  initialStatus?: Record<string, ItemStatus>;
}) {
  const [reviews, setReviews] = useState<HomeReview[]>(initialReviews ?? []);
  const [statusMap, setStatusMap] = useState<Record<string, ItemStatus>>(initialStatus);
  const [loading, setLoading] = useState(typeof initialReviews === "undefined");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof initialReviews !== "undefined") return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch("/api/feed")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setReviews(data.reviews ?? []);
          setStatusMap(data.initialStatus ?? {});
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialReviews]);

  const effectiveReviews = typeof initialReviews !== "undefined" ? initialReviews : reviews;
  const router = useRouter();
  const [activeType, setActiveType] = useState<TypeFilter>("All");
  const [selectedRatingBands, setSelectedRatingBands] =
    useState<Set<RatingFilterOption>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("reviewDate");
  const [sortModalOpen, setSortModalOpen] = useState(false);

  const toggleRatingBand = (band: RatingFilterOption) => {
    setSelectedRatingBands((prev) => {
      const next = new Set(prev);
      if (next.has(band)) next.delete(band);
      else next.add(band);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const list = effectiveReviews.filter((r) => {
      if (activeType === "Films" && r.itemType !== "FILM") {
        return false;
      }
      if (activeType === "Series" && r.itemType !== "SHOW") {
        return false;
      }
      if (activeType === "Books" && r.itemType !== "BOOK") {
        return false;
      }

      if (selectedRatingBands.size === 0) return true;
      return [...selectedRatingBands].some((band) =>
        ratingMatchesBand(r.rating, band),
      );
    });

    // Apply sort
    return [...list].sort((a, b) => {
      if (sortBy === "reviewDate") {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime; // Newest first
      }
      if (sortBy === "rating") {
        return b.rating - a.rating; // Highest first
      }
      // publicationYear - Newest first
      const aYear = a.year ?? 0;
      const bYear = b.year ?? 0;
      return bYear - aYear;
    });
  }, [activeType, selectedRatingBands, effectiveReviews, sortBy]);

  const handleSaveToggle = useCallback(async (itemId: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        saved: !(prev[itemId]?.saved ?? false),
        reviewed: prev[itemId]?.reviewed ?? false,
        reviewId: prev[itemId]?.reviewId,
      },
    }));
    try {
      const res = await fetch(`/api/items/${itemId}/save`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStatusMap((prev) => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            saved: data.saved,
            reviewed: prev[itemId]?.reviewed ?? false,
            reviewId: prev[itemId]?.reviewId,
          },
        }));
      } else {
        setStatusMap((prev) => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            saved: !(prev[itemId]?.saved ?? false),
            reviewed: prev[itemId]?.reviewed ?? false,
            reviewId: prev[itemId]?.reviewId,
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
          reviewId: prev[itemId]?.reviewId,
        },
      }));
    }
  }, []);

  const hasAnyReviews = effectiveReviews.length > 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <header className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">For you</h1>
              <div className="h-9 w-9 rounded-full bg-zinc-100 animate-pulse" />
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-7 w-14 rounded-full bg-zinc-100 animate-pulse" />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="h-4 w-12 rounded bg-zinc-100 animate-pulse" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="h-6 w-6 rounded-full bg-zinc-100 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </header>
          <FeedSkeleton />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <header className="mb-6 sm:mb-8">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">For you</h1>
          </header>
          <section className="flex flex-col items-center justify-center rounded-3xl bg-zinc-50 px-6 py-16 text-center">
            <p className="text-sm text-zinc-600">Could not load your feed. Please try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white"
            >
              Retry
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              For you
            </h1>
            <button
              type="button"
              onClick={() => setSortModalOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Sort"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h4M4 12h4M4 18h4" />
                <path d="M12 6h8M12 12h6M12 18h8" />
              </svg>
            </button>
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

        {!hasAnyReviews ? (
          <section className="flex flex-col items-center justify-center rounded-3xl bg-zinc-50 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-zinc-400">
              <svg
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8.5" r="3.25" />
                <path d="M6.5 19.5a5.5 5.5 0 0 1 11 0" />
              </svg>
            </div>
            <h2 className="mt-6 text-base font-semibold text-zinc-900">
              Your feed is empty
            </h2>
            <p className="mt-2 max-w-xs text-sm text-zinc-600">
              Follow people to see their reviews and ratings in your feed.
            </p>
            <button
              type="button"
              onClick={() => router.push("/search?tab=people")}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Discover people
            </button>
          </section>
        ) : (
          <section className="space-y-4 pb-20">
            {filtered.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <Link
                    href={`/profile/${encodeURIComponent(review.userName)}`}
                    className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200 hover:opacity-90 transition-opacity"
                  >
                    {review.userImage ? (
                      <img
                        src={review.userImage}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-xs font-medium text-white">
                        {review.avatarInitial}
                      </div>
                    )}
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
                      <div
                        className="flex items-center gap-4 text-xs text-zinc-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className={`transition-colors hover:text-zinc-700 ${
                            statusMap[review.itemId]?.saved ? "text-zinc-900" : ""
                          }`}
                          aria-label="Save"
                          onClick={() => handleSaveToggle(review.itemId)}
                        >
                          {statusMap[review.itemId]?.saved ? (
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
                            </svg>
                          ) : (
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
                            </svg>
                          )}
                        </button>
                        <Link
                          href={
                            statusMap[review.itemId]?.reviewed &&
                            statusMap[review.itemId]?.reviewId
                              ? `/items/${review.itemId}/reviews/${statusMap[review.itemId].reviewId}`
                              : `/items/${review.itemId}/review`
                          }
                          className={`transition-colors hover:text-zinc-700 ${
                            statusMap[review.itemId]?.reviewed
                              ? "text-zinc-900"
                              : ""
                          }`}
                          aria-label="Rate"
                        >
                          {statusMap[review.itemId]?.reviewed ? (
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
                            </svg>
                          ) : (
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
                            </svg>
                          )}
                        </Link>
                      </div>
                    </div>

                    <Link
                      href={`/items/${review.itemId}/reviews/${review.id}`}
                      className="mt-4 grid grid-cols-[auto_1fr] gap-3 items-stretch rounded-lg hover:bg-zinc-50/80 -mx-1 px-1 transition-colors"
                    >
                      <div className="h-full overflow-hidden rounded-lg min-w-[4.5rem] w-20">
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-zinc-800">
                          {review.itemImageUrl ? (
                            <img
                              src={review.itemImageUrl}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                          <div className="pointer-events-none absolute inset-0 flex items-start justify-start p-1.5">
                            <span className="pointer-events-auto rounded-full bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-medium text-white leading-none">
                              {review.itemType === "SHOW" ? "SERIES" : review.itemType}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-gray-900">
                          {review.title}
                          {review.year != null && (
                            <span className="text-gray-500"> ({review.year})</span>
                          )}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          {(review.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 flex items-baseline gap-0">
                          <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums text-zinc-900">
                            {Math.floor(review.rating)}
                          </span>
                          {!Number.isInteger(review.rating) && (
                            <span className="-ml-0.5 text-[17px] font-semibold leading-none tracking-tight tabular-nums text-zinc-900">
                              .
                              {Math.round(
                                (review.rating - Math.floor(review.rating)) * 10,
                              )}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm text-zinc-700 line-clamp-2">
                          {review.body}
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

