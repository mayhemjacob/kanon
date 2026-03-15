"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewEditableProps = {
  reviewId: string;
  initialRating: number;
  initialBody: string | null;
};

function EditIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function ratingToParts(rating: number): { whole: number; decimal: number } {
  const whole = Math.floor(rating);
  const decimal = Math.round((rating - whole) * 10) % 10;
  return { whole, decimal };
}

export function ReviewEditable({
  reviewId,
  initialRating,
  initialBody,
}: ReviewEditableProps) {
  const router = useRouter();
  const { whole: initWhole, decimal: initDecimal } = ratingToParts(initialRating);

  const [editSection, setEditSection] = useState<"rating" | "reflection" | null>(null);
  const [whole, setWhole] = useState(initWhole);
  const [decimal, setDecimal] = useState(initDecimal);
  const [bodyValue, setBodyValue] = useState(initialBody ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rating = whole + decimal / 10;
  const ratingDisplay =
    Number(initialRating) === Math.floor(initialRating)
      ? initialRating.toString()
      : initialRating.toFixed(1);

  function openRatingEdit() {
    setEditSection("rating");
    setSaveError(null);
    const { whole: w, decimal: d } = ratingToParts(initialRating);
    setWhole(w);
    setDecimal(d);
  }

  function openReflectionEdit() {
    setEditSection("reflection");
    setSaveError(null);
    setBodyValue(initialBody ?? "");
  }

  async function saveRating() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: Math.min(10, Math.round(rating * 10) / 10) }),
      });
      if (res.ok) {
        setEditSection(null);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err?.error ?? "Could not save. Please try again.");
      }
    } catch {
      setSaveError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveReflection() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: bodyValue.trim() || null }),
      });
      if (res.ok) {
        setEditSection(null);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err?.error ?? "Could not save. Please try again.");
      }
    } catch {
      setSaveError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Rating */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Rating
          </div>
          {editSection !== "rating" && (
            <button
              type="button"
              onClick={openRatingEdit}
              aria-label="Edit rating"
              className="inline-flex items-center justify-center rounded-full bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200"
            >
              <EditIcon />
            </button>
          )}
        </div>
        {saveError && editSection === "rating" ? (
          <p className="text-sm text-red-600">{saveError}</p>
        ) : null}
        {editSection === "rating" ? (
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWhole(n)}
                  className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition-colors ${
                    whole === n
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-zinc-700">Fine-tune</span>
                <span className="text-2xl font-semibold tabular-nums text-zinc-900">
                  {whole}.{decimal}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={9}
                step={1}
                value={decimal}
                onChange={(e) => setDecimal(Number(e.target.value))}
                className="mt-2 h-2 w-full appearance-none rounded-full bg-zinc-200 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveRating}
                disabled={saving}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditSection(null)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 py-6 text-center">
            <span className="text-4xl font-semibold tracking-tight text-zinc-900">
              {ratingDisplay}
            </span>
          </div>
        )}
      </div>

      {/* Reflection */}
      <div className="space-y-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Reflection
          </div>
          {editSection !== "reflection" && (
            <button
              type="button"
              onClick={openReflectionEdit}
              aria-label="Edit reflection"
              className="inline-flex items-center justify-center rounded-full bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200"
            >
              <EditIcon />
            </button>
          )}
        </div>
        {saveError && editSection === "reflection" ? (
          <p className="text-sm text-red-600">{saveError}</p>
        ) : null}
        {editSection === "reflection" ? (
          <div className="space-y-2">
            <textarea
              value={bodyValue}
              onChange={(e) => setBodyValue(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveReflection}
                disabled={saving}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditSection(null);
                  setBodyValue(initialBody ?? "");
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
            <p className="text-sm text-zinc-800 whitespace-pre-line">
              {initialBody || "No written reflection for this review."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
