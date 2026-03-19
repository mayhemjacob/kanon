"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ItemType = "FILM" | "SHOW" | "BOOK";

type SavedItem = {
  itemId: string;
  title: string;
  type: ItemType;
  year?: number | null;
  imageUrl?: string | null;
};

const typeOptions = ["All", "Films", "Series", "Books"] as const;
type TypeFilter = (typeof typeOptions)[number];

function typeLabel(type: ItemType): string {
  return type === "FILM" ? "FILM" : type === "SHOW" ? "SERIES" : "BOOK";
}

export default function SavedPage() {
  const [activeType, setActiveType] = useState<TypeFilter>("All");
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/saved", { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setSavedItems(
            (Array.isArray(data) ? data : []).map(
              (s: { itemId: string; title: string; type: ItemType; year?: number | null; imageUrl?: string | null }) => ({
                itemId: s.itemId,
                title: s.title,
                type: s.type,
                year: s.year ?? null,
                imageUrl: s.imageUrl ?? null,
              })
            )
          );
        } else {
          setSavedItems([]);
        }
      } catch {
        setSavedItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (activeType === "All") return savedItems;
    if (activeType === "Films") return savedItems.filter((i) => i.type === "FILM");
    if (activeType === "Series") return savedItems.filter((i) => i.type === "SHOW");
    if (activeType === "Books") return savedItems.filter((i) => i.type === "BOOK");
    return savedItems;
  }, [activeType, savedItems]);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 pb-20">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Saved
        </h1>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {typeOptions.map((label) => {
            const isActive = activeType === label;
            return (
              <button
                key={label}
                onClick={() => setActiveType(label)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
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

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          {filtered.map((item) => (
            <Link
              key={item.itemId}
              href={`/items/${item.itemId}`}
              className="relative block overflow-hidden rounded-2xl bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-300">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <span className="absolute left-2 top-2 rounded-full bg-zinc-900/90 px-2 py-0.5 text-[10px] font-medium text-white">
                {typeLabel(item.type)}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-3">
                <span className="line-clamp-2 text-sm font-medium text-white">
                  {item.title}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-500">
            No saved items in this category.
          </p>
        )}
      </div>
    </main>
  );
}
