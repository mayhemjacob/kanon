"use client";

import { useState } from "react";

export function ListSaveButton({
  listId,
  initialSaved,
  onSavedChange,
  size = "md",
}: {
  listId: string;
  initialSaved: boolean;
  onSavedChange?: (saved: boolean) => void;
  size?: "sm" | "md";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggleSave() {
    if (busy) return;
    const optimisticSaved = !saved;
    setBusy(true);
    setSaved(optimisticSaved);
    onSavedChange?.(optimisticSaved);
    try {
      const res = await fetch(`/api/lists/${encodeURIComponent(listId)}/save`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Could not update save");
      const data = await res.json().catch(() => null);
      if (!data || typeof data.saved !== "boolean") throw new Error("Could not update save");
      setSaved(data.saved);
      if (data.saved !== optimisticSaved) onSavedChange?.(data.saved);
    } catch {
      setSaved(!optimisticSaved);
      onSavedChange?.(!optimisticSaved);
    } finally {
      setBusy(false);
    }
  }

  const dimensions =
    size === "sm"
      ? "h-9 w-9 rounded-full"
      : "h-10 w-10 rounded-xl";

  return (
    <button
      type="button"
      onClick={() => void toggleSave()}
      disabled={busy}
      className={`flex items-center justify-center ${dimensions} ${
        saved ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
      } hover:bg-zinc-900 hover:text-white disabled:opacity-40`}
      aria-label={saved ? "Unsave list" : "Save list"}
    >
      {saved ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
        </svg>
      )}
    </button>
  );
}
