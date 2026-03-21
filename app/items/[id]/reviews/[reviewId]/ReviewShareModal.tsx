"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ReviewShareModalProps = {
  open: boolean;
  onClose: () => void;
  reviewId: string;
  itemTitle: string;
  itemImageUrl: string | null;
  rating: number;
};

function imageNeedsUnoptimized(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}

function ratingParts(rating: number): { main: string; hasDecimal: boolean } {
  const hasDecimal = Number(rating) !== Math.floor(rating);
  return {
    main: hasDecimal ? rating.toFixed(1) : String(rating),
    hasDecimal,
  };
}

export function ReviewShareModal({
  open,
  onClose,
  reviewId,
  itemTitle,
  itemImageUrl,
  rating,
}: ReviewShareModalProps) {
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setPublicUrl(null);
      setError(null);
      setCopied(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPublicUrl(null);
    setCopied(false);

    fetch(`/api/reviews/${reviewId}/share`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          path?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || "Could not create share link");
        }
        if (!data.path || typeof data.path !== "string") {
          throw new Error("Invalid response from server");
        }
        const url = `${window.location.origin}${data.path}`;
        if (!cancelled) setPublicUrl(url);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, reviewId]);

  const shareMessage = publicUrl
    ? `Check out this review on Kanon: ${publicUrl}`
    : "";

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", publicUrl);
    }
  }

  function shareWhatsApp() {
    if (!publicUrl) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const { main: ratingMain } = ratingParts(rating);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="relative max-h-[min(90dvh,calc(100vh-2rem))] w-full max-w-sm overflow-y-auto overscroll-y-contain rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-share-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="review-share-title"
            className="text-base font-semibold tracking-tight text-zinc-900"
          >
            Share Review
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
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

        <div className="mb-4 flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <div className="relative h-[72px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-zinc-200">
            {itemImageUrl ? (
              <Image
                src={itemImageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="52px"
                unoptimized={imageNeedsUnoptimized(itemImageUrl)}
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 line-clamp-2">
              {itemTitle}
            </p>
            <p className="mt-1.5 text-zinc-800">
              <span className="text-lg font-semibold tabular-nums">
                {ratingMain}
              </span>
              <span className="text-sm font-normal text-zinc-500"> /10</span>
            </p>
          </div>
        </div>

        <p className="mb-4 rounded-xl bg-zinc-50 px-3 py-3 text-xs leading-relaxed text-zinc-600">
          Your taste matters. Share what you think and inspire others to
          discover something meaningful.
        </p>

        {loading ? (
          <p className="mb-4 text-center text-sm text-zinc-500">Preparing link…</p>
        ) : null}
        {error ? (
          <p className="mb-4 text-center text-sm text-red-600" role="status">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={copyLink}
          disabled={!publicUrl}
          className="mb-3 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
        >
          <span>{copied ? "Copied!" : "Copy link"}</span>
          <svg
            className="h-4 w-4 text-zinc-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>

        <button
          type="button"
          onClick={shareWhatsApp}
          disabled={!publicUrl}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-medium text-white transition-opacity hover:opacity-95 disabled:pointer-events-none disabled:opacity-50"
        >
          <span>Share to WhatsApp</span>
          <svg
            className="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
