"use client";

import { useState } from "react";

import { ReviewShareModal } from "./ReviewShareModal";

type ReviewShareSectionProps = {
  reviewId: string;
  itemTitle: string;
  itemImageUrl: string | null;
  rating: number;
};

export function ReviewShareSection({
  reviewId,
  itemTitle,
  itemImageUrl,
  rating,
}: ReviewShareSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
      >
        <svg
          className="h-[18px] w-[18px] text-zinc-800"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
        Share
      </button>

      <ReviewShareModal
        open={open}
        onClose={() => setOpen(false)}
        reviewId={reviewId}
        itemTitle={itemTitle}
        itemImageUrl={itemImageUrl}
        rating={rating}
      />
    </>
  );
}
