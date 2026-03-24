"use client";

import {
  touchIconButtonInnerSolidClass,
  touchIconButtonOuterClass,
} from "@/lib/iconButtonTouchTarget";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function isValidHandle(handle: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(handle);
}

export default function EditHandlePage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [initialHandle, setInitialHandle] = useState<string | null>(null);
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
          const current = (data.handle as string | null) ?? "";
          setHandle(current);
          setInitialHandle(current);
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

  const normalized = handle.trim().toLowerCase();
  const valid = isValidHandle(normalized);

  async function onSave() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: normalized }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not update handle.");
        setSaving(false);
        return;
      }
      router.push("/profile");
    } catch {
      setError("Could not update handle.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-md px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-center justify-between">
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
              >
                <path d="M15 6 9 12l6 6" />
              </svg>
            </span>
          </button>
          <h1 className="text-sm font-semibold tracking-tight">
            Edit Handle
          </h1>
          <button
            type="button"
            onClick={onSave}
            disabled={!valid || saving || normalized.length === 0}
            className="text-sm font-semibold text-blue-600 disabled:opacity-40"
          >
            Done
          </button>
        </header>

        <section className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">
              Handle
            </label>
            <div className="flex items-center rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-black/10">
              <span className="mr-1 text-zinc-400">@</span>
              <input
                value={handle}
                onChange={(e) => {
                  const raw = e.target.value.replace(/^@/, "");
                  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
                  setHandle(cleaned);
                  setError(null);
                }}
                className="flex-1 bg-transparent outline-none"
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <p className="rounded-2xl bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Your handle is how others will find and mention you on Kanon.
              Choose wisely!
            </p>
            <ul className="space-y-1 text-xs text-zinc-600">
              <li>At least 3 characters long</li>
              <li>Letters, numbers, and underscores only</li>
              <li>No spaces or special characters</li>
            </ul>
            {error && (
              <p className="text-xs text-red-600" role="status">
                {error}
              </p>
            )}
            {!error && !loading && !valid && handle.length > 0 && (
              <p className="text-xs text-red-600">
                Handle must be 3–20 characters, letters/numbers/underscores
                only.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

