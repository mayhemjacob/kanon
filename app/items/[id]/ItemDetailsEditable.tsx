"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, startTransition } from "react";
import { TAGS } from "@/lib/tags";

type ItemType = "FILM" | "SHOW" | "BOOK";

type ItemDetailsEditableProps = {
  itemId: string;
  itemType: ItemType;
  director: string | null;
  description: string | null;
  tags: string[];
  canEdit?: boolean;
};

function EditIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function labelForDirector(type: ItemType): string {
  return type === "BOOK" ? "Author" : "Director";
}

export function ItemDetailsEditable({
  itemId,
  itemType,
  director,
  description,
  tags,
  canEdit = true,
}: ItemDetailsEditableProps) {
  const router = useRouter();
  const [editSection, setEditSection] = useState<"director" | "description" | "tags" | null>(null);
  /** Shown when not editing — updated on save so router.refresh() flicker doesn’t blank fields */
  const [savedDirector, setSavedDirector] = useState(() => director ?? "");
  const [savedDescription, setSavedDescription] = useState(() => description ?? "");
  const [savedTags, setSavedTags] = useState<string[]>(() => [...tags]);
  const [dirValue, setDirValue] = useState(director ?? "");
  const [descValue, setDescValue] = useState(description ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(() => [...tags]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashNotice(msg: string) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setSaveNotice(msg);
    noticeTimerRef.current = setTimeout(() => {
      setSaveNotice(null);
      noticeTimerRef.current = null;
    }, 2200);
  }

  useEffect(() => {
    setSavedDirector(director ?? "");
    setSavedDescription(description ?? "");
    setSavedTags([...tags]);
    setDirValue(director ?? "");
    setDescValue(description ?? "");
    setSelectedTags([...tags]);
    setSaveNotice(null);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }, [itemId]);

  // Don’t adopt empty props during router.refresh() — avoids blanking fields the user just filled
  useEffect(() => {
    const d = director ?? "";
    if (!d.trim()) return;
    setSavedDirector(d);
    if (editSection !== "director") setDirValue(d);
  }, [director, editSection]);

  useEffect(() => {
    const desc = description ?? "";
    if (!desc.trim()) return;
    setSavedDescription(desc);
    if (editSection !== "description") setDescValue(desc);
  }, [description, editSection]);

  useEffect(() => {
    if (tags.length === 0) return;
    setSavedTags([...tags]);
    if (editSection !== "tags") setSelectedTags([...tags]);
  }, [tags, editSection]);

  function openDirectorEdit() {
    setEditSection("director");
    setSaveError(null);
    setDirValue(savedDirector);
  }
  function openDescriptionEdit() {
    setEditSection("description");
    setSaveError(null);
    setDescValue(savedDescription);
  }
  function openTagsEdit() {
    setEditSection("tags");
    setSaveError(null);
    setSelectedTags([...savedTags]);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function saveDirector() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ director: dirValue.trim() || null }),
      });
      if (res.ok) {
        setSavedDirector(dirValue.trim());
        setEditSection(null);
        flashNotice(`${labelForDirector(itemType)} saved`);
        startTransition(() => router.refresh());
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

  async function saveDescription() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descValue.trim() || null }),
      });
      if (res.ok) {
        setSavedDescription(descValue.trim());
        setEditSection(null);
        flashNotice("Description saved");
        startTransition(() => router.refresh());
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

  async function saveTags() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: selectedTags }),
      });
      if (res.ok) {
        setSavedTags([...selectedTags]);
        setEditSection(null);
        flashNotice("Tags saved");
        startTransition(() => router.refresh());
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
    <div className="mt-8 min-w-0 space-y-6">
      {saveNotice ? (
        <p
          className="text-sm font-medium text-green-700"
          role="status"
          aria-live="polite"
        >
          {saveNotice}
        </p>
      ) : null}
      {/* Director / Author */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">{labelForDirector(itemType)}</h3>
          {editSection !== "director" && canEdit ? (
            <button
              type="button"
              onClick={openDirectorEdit}
              aria-label="Edit director"
              className="inline-flex items-center justify-center rounded-full bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200"
            >
              <EditIcon />
            </button>
          ) : null}
        </div>
        {saveError && editSection === "director" ? (
          <p className="mt-2 text-sm text-red-600">{saveError}</p>
        ) : null}
        {editSection === "director" ? (
          <div className="mt-2 flex min-w-0 gap-2">
            <input
              type="text"
              value={dirValue}
              onChange={(e) => setDirValue(e.target.value)}
              placeholder={`Enter ${labelForDirector(itemType).toLowerCase()}`}
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              autoFocus
            />
            <button
              type="button"
              onClick={saveDirector}
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditSection(null);
                setDirValue(savedDirector);
              }}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">
            {savedDirector || "—"}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">Description</h3>
          {editSection !== "description" && canEdit ? (
            <button
              type="button"
              onClick={openDescriptionEdit}
              aria-label="Edit description"
              className="inline-flex items-center justify-center rounded-full bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200"
            >
              <EditIcon />
            </button>
          ) : null}
        </div>
        {saveError && editSection === "description" ? (
          <p className="mt-2 text-sm text-red-600">{saveError}</p>
        ) : null}
        {editSection === "description" ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              placeholder="Enter description"
              rows={4}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveDescription}
                disabled={saving}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditSection(null);
                  setDescValue(savedDescription);
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-zinc-600 whitespace-pre-line">
            {savedDescription || "—"}
          </p>
        )}
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">Tags</h3>
          {editSection !== "tags" && canEdit ? (
            <button
              type="button"
              onClick={openTagsEdit}
              aria-label="Edit tags"
              className="inline-flex items-center justify-center rounded-full bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200"
            >
              <EditIcon />
            </button>
          ) : null}
        </div>
        {saveError && editSection === "tags" ? (
          <p className="mt-2 text-sm text-red-600">{saveError}</p>
        ) : null}
        {editSection === "tags" ? (
          <div className="mt-2 space-y-3">
            <p className="text-xs text-zinc-500">Select tags for this item</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveTags}
                disabled={saving}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditSection(null);
                  setSelectedTags([...savedTags]);
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {savedTags.length > 0 ? (
              savedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">—</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
