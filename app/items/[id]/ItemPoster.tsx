"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ItemPosterProps = {
  itemId: string;
  title: string;
  imageUrl: string | null;
};

export function ItemPoster({ itemId, title, imageUrl: initialImageUrl }: ItemPosterProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(initialImageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageUrl(initialImageUrl);
    setImageError(false);
    setUploadedDataUrl(null);
    setUrlInput(initialImageUrl ?? "");
  }, [itemId]);

  const previewImage = uploadedDataUrl || (urlInput.trim() || null) || imageUrl;

  function openModal() {
    setModalOpen(true);
    setSaving(false);
    setUploadedDataUrl(null);
    setUrlInput(imageUrl ?? "");
    setError(null);
    setImageError(false);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (result) {
        setUploadedDataUrl(result);
        setUrlInput("");
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function onSavePhoto() {
    let nextImage = uploadedDataUrl || (urlInput.trim() || null);
    if (nextImage?.startsWith("data:") && nextImage.length > 100_000) {
      const { resizeDataUrl } = await import("@/lib/resize-image");
      nextImage = await resizeDataUrl(nextImage, { maxPx: 512, quality: 0.85 });
    }
    setSaving(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: nextImage }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not update photo.");
        return;
      }
      setImageUrl(nextImage);
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      setError(isAbort ? "Request took too long. Please try again." : "Could not update photo.");
    } finally {
      setSaving(false);
    }
  }

  const displayUrl = imageUrl && !imageError ? imageUrl : null;

  return (
    <>
      <div className="relative mx-auto w-40 shrink-0 sm:mx-0 sm:w-48 group">
        <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900/90">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={openModal}
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium text-white"
          aria-label="Edit photo"
        >
          Edit Photo
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden
            onClick={() => !saving && setModalOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Edit Photo</h2>
              <button
                type="button"
                onClick={() => !saving && setModalOpen(false)}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 disabled:pointer-events-none"
                aria-label="Close"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-200">
              {previewImage && !imageError ? (
                <img
                  src={previewImage}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : null}
            </div>

            {imageUrl && (
              <p className="mb-3 text-xs text-zinc-500">
                Replace the cover by uploading a new photo or pasting a new URL below.
              </p>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-sm font-medium text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Upload Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />

            <div className="mb-3">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUploadedDataUrl(null);
                  setError(null);
                }}
                placeholder="Or paste image URL"
                disabled={saving}
                className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-black/5 disabled:opacity-60 disabled:pointer-events-none"
              />
            </div>

            <div className="rounded-2xl bg-blue-50 px-3 py-3 text-xs text-blue-900 mb-4">
              Upload a high-quality cover image for {title}. The photo will be visible to all users.
            </div>

            {error && (
              <p className="mb-3 text-xs text-red-600" role="status">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={onSavePhoto}
              disabled={saving}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-zinc-900 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Photo"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
