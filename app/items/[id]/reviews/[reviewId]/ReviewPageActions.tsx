"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewPageActionsProps = {
  itemId: string;
  saved: boolean;
  reviewedByMe: boolean;
  myReviewId?: string;
};

export function ReviewPageActions({
  itemId,
  saved: initialSaved,
  reviewedByMe,
  myReviewId,
}: ReviewPageActionsProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
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

  const buttonClass = (active: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-full border text-xs ${
      active
        ? "border-zinc-900 bg-zinc-900 text-white"
        : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
    } disabled:opacity-60`;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={toggleSave}
        disabled={loading}
        className={buttonClass(saved)}
        aria-label="Save item"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
        </svg>
      </button>
      <Link
        href={
          myReviewId
            ? `/items/${itemId}/reviews/${myReviewId}`
            : `/items/${itemId}/review`
        }
        className={buttonClass(reviewedByMe)}
        aria-label="Rate this item"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill={reviewedByMe ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
        </svg>
      </Link>
    </div>
  );
}
