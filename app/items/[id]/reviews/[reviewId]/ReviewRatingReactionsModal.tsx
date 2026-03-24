"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { RatingReactionDetailResponse } from "@/lib/reviewRatingReactions";

type ReviewRatingReactionsModalProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  detail: RatingReactionDetailResponse | null;
};

function imageNeedsUnoptimized(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}

function displayHandle(u: {
  handle: string | null;
  name: string | null;
}): string {
  if (u.handle) return `@${u.handle}`;
  if (u.name) return u.name;
  return "@user";
}

function UserRow({
  u,
  onNavigate,
}: {
  u: RatingReactionDetailResponse["tooLowUsers"][number];
  onNavigate: () => void;
}) {
  const label = displayHandle(u);

  const avatar = (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-200">
      {u.image ? (
        <Image
          src={u.image}
          alt=""
          width={32}
          height={32}
          className="h-full w-full object-cover"
          sizes="32px"
          unoptimized={imageNeedsUnoptimized(u.image)}
        />
      ) : null}
    </div>
  );

  const name = (
    <span className="text-sm font-semibold text-zinc-900">{label}</span>
  );

  if (u.handle) {
    return (
      <Link
        href={`/profile/${encodeURIComponent(u.handle)}`}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl py-2 pr-1 transition-colors first:pt-0 last:pb-0 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        aria-label={`View ${label} profile`}
      >
        {avatar}
        {name}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
      {avatar}
      {name}
    </div>
  );
}

export function ReviewRatingReactionsModal({
  open,
  onClose,
  loading,
  error,
  detail,
}: ReviewRatingReactionsModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKey);
    queueMicrotask(() => closeBtnRef.current?.focus());

    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const total = detail?.totalCount ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="relative max-h-[min(90dvh,calc(100vh-2rem))] w-full max-w-sm overflow-y-auto overscroll-y-contain rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-rating-reactions-title"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2
            id="review-rating-reactions-title"
            className="text-base font-semibold tracking-tight text-zinc-900"
          >
            Reactions ({total})
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-zinc-500">Loading…</p>
        ) : null}
        {error ? (
          <p className="py-2 text-center text-sm text-red-600" role="status">
            {error}
          </p>
        ) : null}

        {!loading && !error && detail && detail.totalCount === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            No reactions yet.
          </p>
        ) : null}

        {!loading && !error && detail && detail.totalCount > 0 ? (
          <div className="space-y-0 divide-y divide-zinc-100">
            {detail.tooLowUsers.length > 0 ? (
              <section className="py-3 first:pt-0">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                  <span className="uppercase">Too low</span>
                  <span className="tabular-nums">{detail.tooLowUsers.length}</span>
                </div>
                <div className="pl-0.5">
                  {detail.tooLowUsers.map((u) => (
                    <UserRow key={u.id} u={u} onNavigate={onClose} />
                  ))}
                </div>
              </section>
            ) : null}

            {detail.aboutRightUsers.length > 0 ? (
              <section className="py-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span className="uppercase">About right</span>
                  <span className="tabular-nums">
                    {detail.aboutRightUsers.length}
                  </span>
                </div>
                <div className="pl-0.5">
                  {detail.aboutRightUsers.map((u) => (
                    <UserRow key={u.id} u={u} onNavigate={onClose} />
                  ))}
                </div>
              </section>
            ) : null}

            {detail.tooHighUsers.length > 0 ? (
              <section className="py-3 last:pb-0">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                  <span className="uppercase">Too high</span>
                  <span className="tabular-nums">
                    {detail.tooHighUsers.length}
                  </span>
                </div>
                <div className="pl-0.5">
                  {detail.tooHighUsers.map((u) => (
                    <UserRow key={u.id} u={u} onNavigate={onClose} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
