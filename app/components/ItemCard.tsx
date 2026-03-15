"use client";

import Link from "next/link";

export type ItemType = "FILM" | "SHOW" | "BOOK";

export type ItemCardItem = {
  id: string;
  title: string;
  year: number;
  type: ItemType;
  averageRating: number;
  ratingCount: number;
  tags: string[];
  imageUrl?: string | null;
};

function BookmarkIcon({ filled }: { filled?: boolean }) {
  const className = "h-4 w-4";
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function StarIcon({ className = "h-4 w-4", filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
    </svg>
  );
}

export type ItemCardStatus = { saved?: boolean; reviewed?: boolean; reviewId?: string };

export function ItemCard({
  item,
  saved = false,
  reviewed = false,
  reviewId,
  onSaveToggle,
}: {
  item: ItemCardItem;
  saved?: boolean;
  reviewed?: boolean;
  reviewId?: string;
  onSaveToggle?: (itemId: string) => void;
}) {
  const typeLabel =
    item.type === "FILM" ? "FILM" : item.type === "SHOW" ? "SERIES" : "BOOK";

  return (
    <div className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-zinc-50 sm:px-5">
      <Link
        href={`/items/${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-200">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-zinc-900">
                {item.title}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                <span>{item.year}</span>
                <span>•</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                  {typeLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-700">
            <StarIcon className="h-3.5 w-3.5" filled={reviewed} />
            <span className="text-sm font-medium">
              {Number.isInteger(item.averageRating)
                ? item.averageRating
                : item.averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500">({item.ratingCount})</span>
          </div>

          {item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              {item.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-400">
        <button
          type="button"
          className={`transition-colors hover:text-zinc-700 ${saved ? "text-zinc-900" : ""}`}
          aria-label="Save"
          onClick={() => onSaveToggle?.(item.id)}
        >
          <BookmarkIcon filled={saved} />
        </button>
        <Link
          href={reviewed && reviewId ? `/items/${item.id}/reviews/${reviewId}` : `/items/${item.id}/review`}
          className={`transition-colors hover:text-zinc-700 ${reviewed ? "text-zinc-900" : ""}`}
          aria-label="Rate"
        >
          <StarIcon filled={reviewed} />
        </Link>
      </div>
    </div>
  );
}
