"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resizeDataUrl } from "@/lib/resize-image";

export default function EditPhotoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setCurrentImage(data.image ?? null);
          setHandle(data.handle ?? null);
          if (data.image && typeof data.image === "string") {
            setUrlInput(data.image);
          }
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayHandle = useMemo(
    () => (handle ? `@${handle}` : ""),
    [handle],
  );

  const previewImage = uploadedDataUrl || urlInput || currentImage;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (result) {
        setUploadedDataUrl(result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function onSave() {
    let nextImage = uploadedDataUrl || urlInput || null;
    if (nextImage === currentImage) {
      router.back();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (nextImage?.startsWith("data:") && nextImage.length > 100_000) {
        nextImage = await resizeDataUrl(nextImage, { maxPx: 512, quality: 0.85 });
      }
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: nextImage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not update photo.");
        return;
      }
      router.push("/profile");
    } catch {
      setError("Could not update photo.");
    } finally {
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
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none"
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
          </button>
          <h1 className="text-sm font-semibold tracking-tight">Edit Photo</h1>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
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

        <section className="space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-zinc-200">
              {previewImage && !imageError ? (
                <img
                  src={previewImage}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : null}
            </div>
            {displayHandle && (
              <div className="text-sm font-semibold text-zinc-900">
                {displayHandle}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-zinc-900 text-sm font-medium text-white"
            >
              Upload Photo
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("photo-url-input");
                el?.focus();
              }}
              className="flex h-11 w-full items-center justify-center rounded-2xl border border-zinc-200 text-sm font-medium text-zinc-900"
            >
              Use Photo URL
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          <div className="space-y-2">
            <input
              id="photo-url-input"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value.trim());
                setUploadedDataUrl(null);
                setError(null);
              }}
              placeholder="https://example.com/photo.jpg"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-black/5"
            />
          </div>

          <div className="rounded-2xl bg-blue-50 px-3 py-3 text-xs text-blue-900">
            Choose a photo that represents you. Your profile photo will be
            visible to all Kanon users.
          </div>

          {error && (
            <p className="text-xs text-red-600" role="status">
              {error}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}


