"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ItemActionsProps = {
  itemId: string;
  saved: boolean;
  reviewed: boolean;
  myReviewId?: string;
  variant?: "default" | "icons";
};

export function ItemActions({ itemId, saved: initialSaved, reviewed, myReviewId, variant = "default" }: ItemActionsProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggleSave() {
    setSaved((prev) => !prev);
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${itemId}/save`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved);
        router.refresh();
      } else {
        setSaved((prev) => !prev);
      }
    } catch {
      setSaved((prev) => !prev);
    } finally {
      setLoading(false);
    }
  }

  const iconClass = "h-4 w-4";
  const saveIcon = saved ? (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
    </svg>
  ) : (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
    </svg>
  );
  const rateIcon = reviewed ? (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
    </svg>
  ) : (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
    </svg>
  );

  if (variant === "icons") {
    return (
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <button
          type="button"
          onClick={toggleSave}
          disabled={loading}
          className={`transition-colors hover:text-zinc-700 disabled:opacity-60 ${saved ? "text-zinc-900" : ""}`}
          aria-label="Save"
        >
          {saveIcon}
        </button>
        <Link
          href={reviewed && myReviewId ? `/items/${itemId}/reviews/${myReviewId}` : `/items/${itemId}/review`}
          className={`transition-colors hover:text-zinc-700 ${reviewed ? "text-zinc-900" : ""}`}
          aria-label="Rate"
        >
          {rateIcon}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 flex min-w-0 flex-wrap gap-3">
      <button
        type="button"
        onClick={toggleSave}
        disabled={loading}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-medium sm:flex-none sm:px-5 ${
          saved
            ? "bg-zinc-900 text-white hover:bg-zinc-800"
            : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
        } disabled:opacity-60`}
      >
        {saveIcon}
        Save
      </button>
      <Link
        href={reviewed && myReviewId ? `/items/${itemId}/reviews/${myReviewId}` : `/items/${itemId}/review`}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-medium sm:flex-none sm:px-5 ${
          reviewed ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-900 text-white hover:bg-black"
        }`}
      >
        {rateIcon}
        Rate
      </Link>
    </div>
  );
}
