"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewFormProps {
  itemId: string;
}

export function ReviewForm({ itemId }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState<string>("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 10) {
      setStatus("Rating must be between 1 and 10.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        rating: numericRating,
        body,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setStatus(data?.error || `Error ${res.status}`);
      setSubmitting(false);
      return;
    }

    setStatus("Saved ✅");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your rating (1–10)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-24 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save review"}
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Thoughts (optional)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
            placeholder="What did you think?"
          />
        </div>

        {status ? (
          <p className="text-sm text-zinc-600" role="status">
            {status}
          </p>
        ) : null}
      </form>
    </section>
  );
}

