"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const offline =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";

export function OnboardingForm() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const trimmed = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      setStatus(
        "Handle must be 3–20 characters, letters/numbers/underscores only.",
      );
      setSubmitting(false);
      return;
    }

    // In offline dev mode, just skip the API and continue.
    if (offline) {
      router.push("/search");
      return;
    }

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: trimmed }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setStatus(data?.error || `Error ${res.status}`);
      setSubmitting(false);
      return;
    }

    router.push("/search");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm px-6 py-10">
        <div className="text-center">
          <h1 className="text-base font-semibold tracking-tight">Kanon</h1>
          <h2 className="mt-6 text-xl font-semibold tracking-tight">
            Choose your handle
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            This is how others find you on Kanon. You can change your photo
            anytime from your profile.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Handle</label>
            <div className="flex items-center rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-black/10">
              <span className="text-zinc-400 mr-1">@</span>
              <input
                className="flex-1 bg-transparent outline-none"
                placeholder="yourhandle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
            <p className="text-xs text-zinc-500">
              Only letters, numbers, and underscores.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center rounded-2xl bg-black text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>

          {status ? (
            <p className="text-sm text-red-600" role="status">
              {status}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
