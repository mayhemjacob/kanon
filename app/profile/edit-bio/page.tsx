"use client";

import {
  touchIconButtonInnerSolidClass,
  touchIconButtonOuterClass,
} from "@/lib/iconButtonTouchTarget";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BIO_MAX_LENGTH = 150;

export default function EditBioPage() {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setBio((data.bio as string) ?? "");
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.slice(0, BIO_MAX_LENGTH).trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not update bio.");
        return;
      }
      router.push("/profile");
    } catch {
      setError("Could not update bio.");
    } finally {
      setSaving(false);
    }
  }

  const currentLength = bio.length;
  const isOverLimit = currentLength > BIO_MAX_LENGTH;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-md px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={saving}
            className={`${touchIconButtonOuterClass} disabled:opacity-50 disabled:pointer-events-none`}
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
              >
                <path d="M15 6 9 12l6 6" />
              </svg>
            </span>
          </button>
          <h1 className="text-sm font-semibold tracking-tight">
            Edit Bio
          </h1>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || isOverLimit}
            className="flex min-w-[4rem] items-center justify-end gap-1.5 text-sm font-semibold text-blue-600 disabled:opacity-60"
          >
            {saving ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Saving…
              </>
            ) : (
              "Done"
            )}
          </button>
        </header>

        <section className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX_LENGTH + 1}
              placeholder="Tell others a bit about you..."
              rows={4}
              className="w-full resize-none rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-black/5"
            />
            <div className="flex justify-end">
              <span
                className={`text-xs ${isOverLimit ? "text-red-600" : "text-zinc-500"}`}
              >
                {Math.min(currentLength, BIO_MAX_LENGTH)}/{BIO_MAX_LENGTH}
              </span>
            </div>
            <p className="rounded-2xl bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Your bio will be visible on your profile. Keep it short and interesting!
            </p>
            {error && (
              <p className="text-xs text-red-600" role="status">
                {error}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
