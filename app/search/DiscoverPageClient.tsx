"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ItemCard, type ItemCardItem, type ItemType } from "@/app/components/ItemCard";

type ItemStatus = { saved: boolean; reviewed: boolean; reviewId?: string };

type Person = {
  id: string;
  handle: string;
  bio: string | null;
  image: string | null;
};

type DiscoverTab = "culture" | "people";

type RatingFilterOption = number | "≤3";
const ratingOptions: RatingFilterOption[] = [10, 9, 8, 7, 6, 5, 4, "≤3"];

function ratingMatchesBand(rating: number, band: RatingFilterOption): boolean {
  if (band === "≤3") return rating <= 3;
  return rating >= band && rating < band + 1;
}

export function DiscoverPageClient({
  items,
  people = [],
  initialTab = "culture",
  initialStatus = {},
}: {
  items: ItemCardItem[];
  people?: Person[];
  initialTab?: DiscoverTab;
  initialStatus?: Record<string, ItemStatus>;
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<DiscoverTab>(initialTab);
  const [typeFilter, setTypeFilter] = useState<"All" | ItemType>("All");
  const [selectedRatingBands, setSelectedRatingBands] = useState<Set<RatingFilterOption>>(new Set());
  const [statusMap, setStatusMap] = useState<Record<string, ItemStatus>>(initialStatus);

  const tabFromUrl = searchParams?.get("tab") ?? null;
  useEffect(() => {
    if (tabFromUrl === "people" || tabFromUrl === "culture") {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const discoverItemIds = useMemo(() => items.map((i) => i.id), [items]);

  const toggleRatingBand = useCallback((band: RatingFilterOption) => {
    setSelectedRatingBands((prev) => {
      const next = new Set(prev);
      if (next.has(band)) next.delete(band);
      else next.add(band);
      return next;
    });
  }, []);

  const fetchStatus = useCallback(async () => {
    if (discoverItemIds.length === 0) return;
    try {
      const res = await fetch(`/api/items/status?ids=${discoverItemIds.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        setStatusMap(data);
      }
    } catch {
      // offline or not logged in
    }
  }, [discoverItemIds]);

  useEffect(() => {
    if (discoverItemIds.length === 0) return;
    const hasAllFromServer = discoverItemIds.every((id) =>
      Object.prototype.hasOwnProperty.call(initialStatus, id),
    );
    // Server already sent per-item status for logged-in users; skip duplicate /api/items/status.
    if (hasAllFromServer) return;
    // Logged-out: server passes {}; saved/review defaults are false — no need to call API (401).
    if (Object.keys(initialStatus).length === 0) return;
    // Partial map only (unexpected): refresh from API.
    void fetchStatus();
  }, [discoverItemIds, initialStatus, fetchStatus]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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

  const trimmed = query.trim();

  const filteredItems = useMemo(() => {
    let list = items;
    if (typeFilter !== "All") {
      list = list.filter((item) => item.type === typeFilter);
    }
    if (selectedRatingBands.size > 0) {
      list = list.filter((item) =>
        [...selectedRatingBands].some((band) => ratingMatchesBand(item.averageRating, band)),
      );
    }
    if (!trimmed) return list;
    const q = trimmed.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [items, trimmed, typeFilter, selectedRatingBands]);

  const filteredPeople = useMemo(() => {
    if (!trimmed) return people;
    const q = trimmed.toLowerCase();
    return people.filter(
      (p) =>
        p.handle.toLowerCase().includes(q) ||
        (p.bio ?? "").toLowerCase().includes(q),
    );
  }, [people, trimmed]);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-8 md:pb-8">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Discover
        </h1>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                className="h-4 w-4 text-zinc-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="5.5" />
                <path d="m15 15 3.5 3.5" />
              </svg>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search content, people, genres..."
              className="w-full rounded-2xl bg-zinc-100 px-11 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:bg-zinc-100 focus:ring-2 focus:ring-black/5"
            />
          </div>

          <div className="inline-flex rounded-full bg-zinc-100 p-1 text-xs font-medium text-zinc-700">
            <button
              type="button"
              onClick={() => setTab("culture")}
              className={`rounded-full px-4 py-1.5 ${
                tab === "culture"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600"
              }`}
            >
              Culture
            </button>
            <button
              type="button"
              onClick={() => setTab("people")}
              className={`rounded-full px-4 py-1.5 ${
                tab === "people"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600"
              }`}
            >
              People
            </button>
          </div>

          {tab === "culture" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-zinc-500 mr-1">Type</span>
                {(["All", "Films", "Series", "Books"] as const).map((label) => {
                  const value: "All" | ItemType =
                    label === "All" ? "All" : label === "Films" ? "FILM" : label === "Series" ? "SHOW" : "BOOK";
                  const active = typeFilter === value;
                  return (
                    <button
                      key={label}
                      onClick={() => setTypeFilter(value)}
                      className={`rounded-full px-3 py-1 text-xs transition-colors ${
                        active
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

              <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white">
                {filteredItems.map((item) => (
                  <li key={item.id}>
                    <ItemCard
                      item={item}
                      saved={statusMap[item.id]?.saved ?? false}
                      reviewed={statusMap[item.id]?.reviewed ?? false}
                      reviewId={statusMap[item.id]?.reviewId}
                      onSaveToggle={handleSaveToggle}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "people" && (
            <ul className="space-y-2">
              {filteredPeople.map((person) => {
                const handleSlug = person.handle.replace(/^@/, "");
                return (
                  <li key={person.id}>
                    <Link
                      href={`/profile/${encodeURIComponent(handleSlug)}`}
                      className="flex w-full items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-100 sm:px-5"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-300">
                        {person.image ? (
                          <img
                            src={person.image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-zinc-500">
                            {person.handle[1]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900">
                          {person.handle}
                        </div>
                        {person.bio ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">
                            {person.bio}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

