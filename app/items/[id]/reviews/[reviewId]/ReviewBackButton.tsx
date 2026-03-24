"use client";

import {
  touchIconButtonInnerSolidClass,
  touchIconButtonOuterClass,
} from "@/lib/iconButtonTouchTarget";
import { useRouter } from "next/navigation";

type ReviewBackButtonProps = {
  itemId: string;
  /** When true, use history back (user arrived from home feed with ?from=home). */
  fromHome: boolean;
};

export function ReviewBackButton({ itemId, fromHome }: ReviewBackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (fromHome) {
          router.back();
        } else {
          router.push(`/items/${itemId}/reviews`);
        }
      }}
      className={touchIconButtonOuterClass}
      aria-label={fromHome ? "Back to previous page" : "Back to reviews"}
    >
      <span className={touchIconButtonInnerSolidClass}>
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </span>
    </button>
  );
}
