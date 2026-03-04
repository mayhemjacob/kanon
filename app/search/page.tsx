"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ItemCard, type ItemCardItem, type ItemType } from "@/app/components/ItemCard";

type ItemStatus = { saved: boolean; reviewed: boolean };

const discoverItems: ItemCardItem[] = [
  {
    id: "1",
    title: "Dune: Part Two",
    year: 2024,
    type: "FILM",
    averageRating: 9.2,
    ratingCount: 2,
    tags: ["Sci-Fi", "Adventure"],
  },
  {
    id: "2",
    title: "The Bear",
    year: 2023,
    type: "SHOW",
    averageRating: 9.8,
    ratingCount: 2,
    tags: ["Drama", "Comedy"],
  },
  {
    id: "3",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    year: 2022,
    type: "BOOK",
    averageRating: 8.5,
    ratingCount: 2,
    tags: ["Contemporary", "Drama"],
  },
  {
    id: "4",
    title: "Past Lives",
    year: 2023,
    type: "FILM",
    averageRating: 9.1,
    ratingCount: 2,
    tags: ["Romance", "Drama"],
  },
  {
    id: "5",
    title: "The Midnight Library",
    year: 2020,
    type: "BOOK",
    averageRating: 7.4,
    ratingCount: 2,
    tags: ["Fantasy", "Thought-Provoking"],
  },
];

type Person = {
  id: string;
  handle: string;
  bio: string;
};

const discoverPeople: Person[] = [
  { id: "1", handle: "@alexchen", bio: "Cinephile obsessed with cinematography and sound design." },
  { id: "2", handle: "@sarahkim", bio: "TV drama enthusiast. Always binging something new." },
  { id: "3", handle: "@mikejones", bio: "Bookworm and gamer. Love stories about connection." },
  { id: "4", handle: "@emilywang", bio: "Foreign films and indie books. The weirder, the better." },
  { id: "5", handle: "@davidlee", bio: "Cozy mysteries and feel-good content." },
  { id: "6", handle: "@jessicamartinez", bio: "Sharp dialogue, complex characters, prestige TV." },
];

type DiscoverTab = "culture" | "people";

type RatingFilterOption = number | "≤3";
const ratingOptions: RatingFilterOption[] = [10, 9, 8, 7, 6, 5, 4, "≤3"];

function ratingMatchesBand(rating: number, band: RatingFilterOption): boolean {
  if (band === "≤3") return rating <= 3;
  return rating >= band && rating < band + 1;
}

const discoverItemIds = discoverItems.map((i) => i.id);

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<DiscoverTab>("culture");
  const [typeFilter, setTypeFilter] = useState<"All" | ItemType>("All");
  const [selectedRatingBands, setSelectedRatingBands] = useState<Set<RatingFilterOption>>(new Set());
  const [statusMap, setStatusMap] = useState<Record<string, ItemStatus>>({});

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
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSaveToggle = useCallback(async (itemId: string) => {
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

  const trimmed = query.trim();

  const filteredItems = useMemo(() => {
    let list = discoverItems;
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
  }, [trimmed, typeFilter, selectedRatingBands]);

  const filteredPeople = useMemo(() => {
    if (!trimmed) return discoverPeople;
    const q = trimmed.toLowerCase();
    return discoverPeople.filter(
      (p) =>
        p.handle.toLowerCase().includes(q) ||
        p.bio.toLowerCase().includes(q),
    );
  }, [trimmed]);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 pb-20">
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
                {(["All", "Films", "Shows", "Books"] as const).map((label) => {
                  const value: "All" | ItemType =
                    label === "All" ? "All" : label === "Films" ? "FILM" : label === "Shows" ? "SHOW" : "BOOK";
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
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-300" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900">
                          {person.handle}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">
                          {person.bio}
                        </p>
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
