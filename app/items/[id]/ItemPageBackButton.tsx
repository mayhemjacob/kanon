"use client";

import {
  touchIconButtonInnerSolidClass,
  touchIconButtonOuterClass,
} from "@/lib/iconButtonTouchTarget";
import { useRouter } from "next/navigation";

/**
 * Uses browser history so flows like Home → Review → Item return to Review,
 * not always to Home (the old hardcoded Link href="/" behavior).
 */
export function ItemPageBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={touchIconButtonOuterClass}
      aria-label="Back"
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
          <path d="M15 6 9 12l6 6" />
        </svg>
      </span>
    </button>
  );
}
