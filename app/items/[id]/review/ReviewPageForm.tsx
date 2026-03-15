"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ReviewItemInfo = {
  id: string;
  title: string;
  year: number | null;
  tags: string[];
  imageUrl?: string | null;
};

const DECIMALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function ReviewPageForm({ item }: { item: ReviewItemInfo }) {
  const router = useRouter();
  const [whole, setWhole] = useState<number | null>(null);
  const [decimal, setDecimal] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rating = whole !== null ? whole + decimal / 10 : null;
  const showFineTune = whole !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === null || rating < 1) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          rating: Math.min(10, Math.round(rating * 10) / 10),
          body: body.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Error ${res.status}`);
      }
      router.push(`/items/${item.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-8 pb-20">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/items/${item.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            aria-label="Back"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6 9 12l6 6" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">Review</h1>
        </div>

        {/* Item summary */}
        <div className="mb-8 flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-900">
              {item.title}
            </h2>
            {item.year && (
              <p className="mt-0.5 text-sm text-zinc-500">{item.year}</p>
            )}
            {item.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* YOUR RATING */}
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              YOUR RATING
            </label>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const isSelected = whole === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWhole(n)}
                    className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            {showFineTune && (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-zinc-700">
                    Fine-tune
                  </span>
                  <span className="text-2xl font-semibold tabular-nums text-zinc-900">
                    {whole}.{decimal}
                  </span>
                </div>
                <div className="mt-2 px-1">
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={1}
                    value={decimal}
                    onChange={(e) => setDecimal(Number(e.target.value))}
                    className="h-2 w-full appearance-none rounded-full bg-zinc-200 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                    {DECIMALS.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* WHAT DID IT MAKE YOU FEEL? */}
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              WHAT DID IT MAKE YOU FEEL?
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              className="mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={rating === null || submitting}
            className="w-full rounded-2xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {submitting ? "Sharing..." : "Share"}
          </button>
        </form>
      </div>
    </main>
  );
}
