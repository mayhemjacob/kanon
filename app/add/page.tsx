"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ItemCard, type ItemCardItem, type ItemType } from "@/app/components/ItemCard";
import { TAGS } from "@/lib/tags";
import { resizeDataUrl } from "@/lib/resize-image";

export default function AddContentPage() {
  const router = useRouter();
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";

  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const [results, setResults] = useState<ItemCardItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<ItemType>("FILM");
  const [formYear, setFormYear] = useState("");
  const [formCreator, setFormCreator] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!trimmed || offline) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearchLoading(true);
      fetch(`/api/items?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) {
            setResults(
              data.map((item: { id: string; title: string; year: number; type: string; imageUrl?: string | null; averageRating?: number; ratingCount?: number; tags?: string[] }) => ({
                id: item.id,
                title: item.title,
                year: item.year ?? 0,
                type: item.type as ItemType,
                averageRating: item.averageRating ?? 0,
                ratingCount: item.ratingCount ?? 0,
                tags: item.tags ?? [],
                imageUrl: item.imageUrl ?? null,
              }))
            );
          }
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, offline]);

  const showEmptyState = !trimmed && !showCreate;
  const showNoResults = !!trimmed && !searchLoading && results.length === 0 && !showCreate;
  const showSearchLoading = !!trimmed && searchLoading;

  function handleAddClick() {
    setShowCreate(true);
    setFormTitle(trimmed);
    setSubmitError(null);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function readFileAsDataUrl(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (result) setCoverImageUrl(result);
    };
    reader.onerror = () => {
      setCoverImageUrl(null);
      setImageFileName(null);
    };
    reader.readAsDataURL(file);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (file) readFileAsDataUrl(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) readFileAsDataUrl(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle) return;

    if (offline) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setShowCreate(false);
      }, 500);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let imageUrl = coverImageUrl ?? null;
      if (imageUrl?.startsWith("data:") && imageUrl.length > 100_000) {
        imageUrl = await resizeDataUrl(imageUrl, { maxPx: 512, quality: 0.85 });
      }
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle,
            type: formType,
            year: formYear ? Number(formYear) : null,
            imageUrl,
            director: formCreator.trim() || null,
            description: formDescription.trim() || null,
            tags: selectedTags,
          }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }

      const created = await res.json();
      router.push(`/items/${created.id}`);
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:px-6 sm:py-8 sm:pb-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Add Content
          </h1>
        </header>

        <div className="space-y-6">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                className="h-4 w-4 text-zinc-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="5.5" />
                <path d="m15 15 3.5 3.5" />
              </svg>
            </div>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowCreate(false);
              }}
              placeholder="Search for a film, show, or book..."
              className="w-full rounded-2xl bg-zinc-100 px-11 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:bg-zinc-100 focus:ring-2 focus:ring-black/5"
            />
            {trimmed && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setShowCreate(false);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400 hover:text-zinc-600"
                aria-label="Clear search"
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
                  <path d="m8 8 8 8M16 8l-8 8" />
                </svg>
              </button>
            )}
          </div>

          {showEmptyState && (
            <div className="pt-16 text-center text-sm text-zinc-500">
              Search for a title to add it to your collection
            </div>
          )}

          {showSearchLoading && (
            <div className="py-8 text-center text-sm text-zinc-500">
              Searching...
            </div>
          )}

          {!showEmptyState && !searchLoading && results.length > 0 && (
            <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white">
              {results.map((item) => (
                <li key={item.id}>
                  <ItemCard item={item} />
                </li>
              ))}
            </ul>
          )}

          {showNoResults && (
            <div className="pt-10 text-center">
              <p className="text-sm text-zinc-500">
                No results found for{" "}
                <span className="font-medium text-zinc-700">
                  &quot;{trimmed}&quot;
                </span>
              </p>
              <button
                type="button"
                onClick={handleAddClick}
                className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black"
              >
                Add &quot;{trimmed}&quot; to Kanon
              </button>
            </div>
          )}

          {showCreate && (
            <section className="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Add New Content
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label="Close"
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
                    <path d="m8 8 8 8M16 8l-8 8" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-medium text-zinc-700">
                    Title
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700">
                    Type
                  </label>
                  <div className="mt-2 flex rounded-full bg-zinc-100 p-1 text-xs font-medium text-zinc-700">
                    {(["FILM", "SHOW", "BOOK"] as ItemType[]).map((type) => {
                      const active = formType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormType(type)}
                          className={`flex-1 rounded-full px-4 py-1.5 ${
                            active
                              ? "bg-zinc-900 text-white shadow-sm"
                              : "text-zinc-700"
                          }`}
                        >
                          {type === "FILM"
                            ? "Film"
                            : type === "SHOW"
                            ? "Series"
                            : "Book"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-700">
                      Year
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      placeholder="2024"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-700">
                      Director/Author
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
                      value={formCreator}
                      onChange={(e) => setFormCreator(e.target.value)}
                      placeholder="Enter director or author"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700">
                    Image
                  </label>
                  {coverImageUrl ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <div className="relative aspect-[3/4] w-full max-w-[180px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                        <Image
                          src={coverImageUrl}
                          alt="Cover preview"
                          fill
                          className="object-cover"
                          sizes="180px"
                          unoptimized={
                            coverImageUrl.startsWith("data:") ||
                            coverImageUrl.startsWith("blob:")
                          }
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImageUrl(null);
                            setImageFileName(null);
                          }}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                          aria-label="Remove image"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {imageFileName && (
                        <p className="text-[11px] text-zinc-500">{imageFileName}</p>
                      )}
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-600 hover:text-zinc-900">
                        <span>Change image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                  ) : (
                    <label
                      className="mt-2 flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 17.5V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
                        <path d="M9 13.5 11.5 11l3 3.5L17 12l3 3.5" />
                        <circle cx="9" cy="9" r="1.1" />
                      </svg>
                      <div className="text-xs font-medium text-zinc-700">
                        <span className="md:hidden">Take a picture or upload media</span>
                        <span className="hidden md:inline">Upload Image</span>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        <span className="md:hidden">Tap to take a photo or choose from gallery</span>
                        <span className="hidden md:inline">Click to browse or drag and drop</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                  <div className="mt-2">
                    <input
                      type="url"
                      placeholder="Or paste image URL"
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                      value={coverImageUrl && coverImageUrl.startsWith("http") ? coverImageUrl : ""}
                      onChange={(e) => {
                        const url = e.target.value.trim();
                        setCoverImageUrl(url || null);
                        setImageFileName(url ? "URL" : null);
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700">
                    Description
                  </label>
                  <textarea
                    className="mt-2 min-h-[80px] w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Enter a description"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700">
                    Tags
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TAGS.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full px-3 py-1 text-xs ${
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
                </div>

                {submitError && (
                  <p className="text-xs text-red-500">{submitError}</p>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={!formTitle || isSubmitting}
                    className="flex w-full items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    {isSubmitting ? "Adding..." : "Add Content"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

