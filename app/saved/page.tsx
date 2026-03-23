"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";

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

function imageNeedsUnoptimized(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}

export default function SavedPage() {
  const [activeType, setActiveType] = useState<TypeFilter>("All");
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsavingId, setUnsavingId] = useState<string | null>(null);

  async function handleUnsave(e: React.MouseEvent, itemId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (unsavingId) return;
    const item = savedItems.find((i) => i.itemId === itemId);
    if (!item) return;
    setUnsavingId(itemId);
    setSavedItems((prev) => prev.filter((i) => i.itemId !== itemId));
    try {
      const res = await fetch(`/api/items/${itemId}/save`, { method: "POST" });
      if (!res.ok) {
        setSavedItems((prev) => [...prev, item]);
      }
    } catch {
      setSavedItems((prev) => [...prev, item]);
    } finally {
      setUnsavingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
      } finally {
        if (!cancelled) setLoading(false);
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

  const firstFilteredCoverIndex = useMemo(
    () => filtered.findIndex((i) => !!i.imageUrl),
    [filtered]
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8 md:pb-8">
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
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl bg-zinc-200"
                aria-hidden
              >
                <div className="relative aspect-[3/4] w-full">
                  <div className="h-full w-full animate-pulse bg-zinc-300" />
                  <div className="absolute inset-0 p-1.5">
                    <div className="h-5 w-12 rounded-full bg-zinc-400/80" />
                  </div>
                </div>
                <div className="absolute inset-x-3 bottom-3 h-4 w-24 animate-pulse rounded bg-zinc-400/80" />
              </div>
            ))
          ) : (
          filtered.map((item, index) => {
            const coverSrc = normalizeItemImageUrlForNext(item.imageUrl);
            return (
            <Link
              key={item.itemId}
              href={`/items/${item.itemId}`}
              className="relative block overflow-hidden rounded-2xl bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-300">
                {coverSrc ? (
                  <Image
                    src={coverSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 45vw, 320px"
                    priority={
                      index === firstFilteredCoverIndex &&
                      firstFilteredCoverIndex !== -1
                    }
                    unoptimized={imageNeedsUnoptimized(coverSrc)}
                  />
                ) : null}
                <div className="pointer-events-none absolute inset-0 flex items-start justify-start p-1.5">
                  <span className="pointer-events-auto rounded-full bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-medium text-white leading-none">
                    {typeLabel(item.type)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => handleUnsave(e, item.itemId)}
                disabled={unsavingId === item.itemId}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/90 text-white hover:bg-zinc-900 disabled:opacity-60"
                aria-label="Unsave"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
                </svg>
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-3">
                <span className="line-clamp-2 text-sm font-medium text-white">
                  {item.title}
                </span>
              </div>
            </Link>
          );
          })
          )}
        </div>

        {!loading && filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-500">
            No saved items in this category.
          </p>
        )}
      </div>
    </main>
  );
}
