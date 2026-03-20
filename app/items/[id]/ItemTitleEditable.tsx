"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";

type ItemTitleEditableProps = {
  itemId: string;
  title: string;
  canEdit?: boolean;
};

function EditIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function ItemTitleEditable({
  itemId,
  title,
  canEdit = true,
}: ItemTitleEditableProps) {
  const router = useRouter();
  const [displayTitle, setDisplayTitle] = useState(title);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const saveFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Full reset only when opening a different item (omit `title` from deps so refresh
  // can’t push an empty title and wipe what the user just saved).
  useEffect(() => {
    setDisplayTitle(title);
    setValue(title);
    setSavedFlash(false);
    if (saveFlashTimerRef.current) {
      clearTimeout(saveFlashTimerRef.current);
      saveFlashTimerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- title read when itemId changes only
  }, [itemId]);

  // After refresh, server may briefly send an empty title — never clobber a value we already show
  useEffect(() => {
    const t = title.trim();
    if (!t) return;
    setDisplayTitle(t);
    if (!editing) setValue(t);
  }, [title, editing]);

  function startEdit() {
    setEditing(true);
    setValue(displayTitle);
    setError(null);
  }

  async function save() {
    const trimmed = value.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        setDisplayTitle(trimmed);
        setEditing(false);
        setSavedFlash(true);
        if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current);
        saveFlashTimerRef.current = setTimeout(() => {
          setSavedFlash(false);
          saveFlashTimerRef.current = null;
        }, 2200);
        startTransition(() => {
          router.refresh();
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.error ?? "Could not save. Please try again.");
      }
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEditing(false);
    setValue(displayTitle);
    setError(null);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter title"
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-2xl font-semibold tracking-tight sm:text-3xl focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || !value.trim()}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
      <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight sm:text-3xl">
        {displayTitle}
      </h1>
      {savedFlash ? (
        <span
          className="mt-1 shrink-0 text-xs font-medium text-green-700"
          role="status"
        >
          Saved
        </span>
      ) : null}
      {canEdit ? (
        <button
          type="button"
          onClick={startEdit}
          aria-label="Edit title"
          className="mt-1 inline-flex items-center justify-center rounded-full bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200 shrink-0"
        >
          <EditIcon />
        </button>
      ) : null}
    </div>
  );
}
