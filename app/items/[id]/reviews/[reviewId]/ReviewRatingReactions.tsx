"use client";

import type { ReviewRatingReactionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  optimisticReactionSummary,
  type RatingReactionDetailResponse,
  type RatingReactionSummary,
} from "@/lib/reviewRatingReactions";
import { ReviewRatingReactionPicker } from "./ReviewRatingReactionPicker";
import { ReviewRatingReactionsModal } from "./ReviewRatingReactionsModal";

type ReviewRatingReactionsProps = {
  reviewId: string;
  initialSummary: RatingReactionSummary;
  signedIn: boolean;
  offline?: boolean;
};

function ChipIcon({ kind }: { kind: "up" | "check" | "down" }) {
  if (kind === "up") {
    return (
      <svg
        className="h-3 w-3 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    );
  }
  if (kind === "check") {
    return (
      <svg
        className="h-3 w-3 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg
      className="h-3 w-3 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

export function ReviewRatingReactions({
  reviewId,
  initialSummary,
  signedIn,
  offline = false,
}: ReviewRatingReactionsProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<RatingReactionSummary>(initialSummary);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<RatingReactionDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  const openModal = useCallback(() => {
    setModalOpen(true);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    fetch(`/api/reviews/${reviewId}/rating-reactions/detail`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as
          | RatingReactionDetailResponse
          | { error?: string };
        if (!res.ok) {
          throw new Error(
            "error" in data && typeof data.error === "string"
              ? data.error
              : "Could not load reactions"
          );
        }
        setDetail(data as RatingReactionDetailResponse);
      })
      .catch((e) => {
        setDetailError(
          e instanceof Error ? e.message : "Could not load reactions"
        );
      })
      .finally(() => setDetailLoading(false));
  }, [reviewId]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setDetail(null);
    setDetailError(null);
  }, []);

  const requireAuth = useCallback(() => {
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/";
    router.push(`/login?callbackUrl=${encodeURIComponent(path)}`);
  }, [router]);

  const postReaction = useCallback(
    async (type: ReviewRatingReactionType) => {
      if (offline || !signedIn) return;
      const prev = summaryRef.current;
      const optimistic = optimisticReactionSummary(prev, type);
      setSummary(optimistic);
      setActionError(null);
      setPickerOpen(false);

      try {
        const res = await fetch(`/api/reviews/${reviewId}/rating-reactions`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reactionType: type }),
        });
        const data = (await res.json().catch(() => ({}))) as
          | RatingReactionSummary
          | { error?: string };
        if (!res.ok) {
          setSummary(prev);
          setActionError(
            typeof data === "object" &&
              data &&
              "error" in data &&
              typeof data.error === "string"
              ? data.error
              : "Could not update reaction"
          );
          return;
        }
        if (
          "tooLowCount" in data &&
          typeof data.tooLowCount === "number"
        ) {
          setSummary(data as RatingReactionSummary);
        }
      } catch {
        setSummary(prev);
        setActionError("Could not update reaction");
      }
    },
    [offline, reviewId, signedIn]
  );

  const onPlusClick = () => {
    if (offline) return;
    if (!signedIn) {
      requireAuth();
      return;
    }
    setPickerOpen((o) => !o);
  };

  const chips: {
    type: ReviewRatingReactionType;
    count: number;
    icon: "up" | "check" | "down";
    srLabel: string;
  }[] = [
    {
      type: "TOO_LOW",
      count: summary.tooLowCount,
      icon: "up",
      srLabel: "Too low",
    },
    {
      type: "ABOUT_RIGHT",
      count: summary.aboutRightCount,
      icon: "check",
      srLabel: "About right",
    },
    {
      type: "TOO_HIGH",
      count: summary.tooHighCount,
      icon: "down",
      srLabel: "Too high",
    },
  ];

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-1">
        {chips.map((c) => {
          const selected = summary.currentUserReaction === c.type;
          return (
            <button
              key={c.type}
              type="button"
              onClick={openModal}
              disabled={offline}
              className={`inline-flex h-7 min-w-[2.25rem] items-center justify-center gap-1 rounded-full border px-2 text-xs font-medium tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 ${
                selected
                  ? "border-zinc-300 bg-zinc-200/80 text-zinc-900"
                  : "border-transparent bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80"
              }`}
              aria-label={`${c.srLabel}: ${c.count} reactions. Open list`}
            >
              <ChipIcon kind={c.icon} />
              <span aria-hidden>{c.count}</span>
            </button>
          );
        })}

        <div className="relative">
          <button
            type="button"
            onClick={onPlusClick}
            disabled={offline}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50"
            aria-label={
              signedIn
                ? "Add or change your rating reaction"
                : "Sign in to react to this rating"
            }
            aria-expanded={pickerOpen}
            aria-haspopup="menu"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <ReviewRatingReactionPicker
            open={pickerOpen && !offline}
            onClose={() => setPickerOpen(false)}
            onSelect={(t) => void postReaction(t)}
            currentUserReaction={summary.currentUserReaction}
          />
        </div>
        </div>

        {actionError ? (
          <p className="max-w-[min(100%,18rem)] text-right text-xs leading-snug text-red-600" role="status">
            {actionError}
          </p>
        ) : null}
      </div>

      <ReviewRatingReactionsModal
        open={modalOpen}
        onClose={closeModal}
        loading={detailLoading}
        error={detailError}
        detail={detail}
      />
    </>
  );
}
