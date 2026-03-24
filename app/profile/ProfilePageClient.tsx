"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { formatTimeAgo } from "@/lib/date";
import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";
import {
  ProfileListCard,
  type ProfileListPreview,
} from "./components/ProfileListCard";

export type ProfileState = {
  handle: string | null;
  image: string | null;
  bio: string | null;
  followers: number | null;
  following: number | null;
};

export type ReviewCard = {
  id: string;
  itemId: string;
  reviewId: string;
  type: string;
  rating: number;
  title: string;
  imageUrl: string | null;
  createdAt: string; // ISO date from server/API
  year: number | null;
};

type SortOption = "reviewDate" | "rating" | "publicationYear";
type ProfileTab = "rated" | "lists";

type RatingFilterOption = number | "≤3";
const ratingOptions: RatingFilterOption[] = [10, 9, 8, 7, 6, 5, 4, "≤3"];

function ratingMatchesBand(rating: number, band: RatingFilterOption): boolean {
  if (band === "≤3") return rating <= 3;
  return rating >= band && rating < band + 1;
}

export default function ProfilePageClient({
  initialProfile,
  initialCards,
  initialLists,
}: {
  initialProfile: ProfileState;
  initialCards: ReviewCard[];
  initialLists: ProfileListPreview[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams?.get("tab");
  const initialTab: ProfileTab = tabFromQuery === "lists" ? "lists" : "rated";
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [activeType, setActiveType] =
    useState<"All" | "Films" | "Series" | "Books">("All");
  const [selectedRatingBands, setSelectedRatingBands] = useState<Set<RatingFilterOption>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("reviewDate");
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [cards, setCards] = useState<ReviewCard[]>(initialCards);
  const [lists, setLists] = useState<ProfileListPreview[]>(initialLists);
  const [profileLoading, setProfileLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(initialProfile);
    setCards(initialCards);
    setLists(initialLists);
  }, [initialProfile, initialCards, initialLists]);

  useEffect(() => {
    setActiveTab(tabFromQuery === "lists" ? "lists" : "rated");
  }, [tabFromQuery]);

  const refreshListSavedStates = useCallback(async () => {
    const ids = lists.map((l) => l.id).filter(Boolean);
    if (ids.length === 0) return;
    try {
      const params = new URLSearchParams({ ids: ids.join(",") });
      const res = await fetch(`/api/lists/status?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const byId = (await res.json().catch(() => null)) as
        | Record<string, { saved?: boolean }>
        | null;
      if (!byId || typeof byId !== "object") return;
      setLists((prev) =>
        prev.map((list) => {
          const status = byId[list.id];
          if (!status || typeof status.saved !== "boolean") return list;
          return { ...list, saved: status.saved };
        }),
      );
    } catch {
      // keep current UI state
    }
  }, [lists]);

  useEffect(() => {
    if (activeTab !== "lists") return;
    void refreshListSavedStates();
  }, [activeTab, refreshListSavedStates]);

  useEffect(() => {
    function onFocus() {
      if (activeTab !== "lists") return;
      void refreshListSavedStates();
    }
    function onPageShow() {
      if (activeTab !== "lists") return;
      void refreshListSavedStates();
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [activeTab, refreshListSavedStates]);

  const loadProfile = useCallback(async (showLoading = true) => {
    if (showLoading) setProfileLoading(true);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setProfile({
        handle: data.handle ?? null,
        image: data.image ?? null,
        bio: data.bio ?? null,
        followers: data.followers ?? null,
        following: data.following ?? null,
      });
    } catch {
      // ignore, keep defaults
    } finally {
      if (showLoading) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const onFocus = () => loadProfile(false);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadProfile]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const raw = e.target;
      const el =
        raw instanceof Element ? raw : (raw as Node).parentElement;
      if (!el) {
        setMenuOpen(false);
        return;
      }
      if (profileMenuRef.current?.contains(el)) return;
      if (el.closest("[data-profile-keep-menu-open]")) return;
      setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const toggleRatingBand = useCallback((band: RatingFilterOption) => {
    setSelectedRatingBands((prev) => {
      const next = new Set(prev);
      if (next.has(band)) next.delete(band);
      else next.add(band);
      return next;
    });
  }, []);

  const filteredCards = useMemo(() => {
    let list = cards;
    if (activeType === "Films") list = list.filter((c) => c.type === "FILM");
    else if (activeType === "Series") list = list.filter((c) => c.type === "SHOW");
    else if (activeType === "Books") list = list.filter((c) => c.type === "BOOK");
    if (selectedRatingBands.size > 0) {
      list = list.filter((c) =>
        [...selectedRatingBands].some((band) => ratingMatchesBand(c.rating, band))
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "reviewDate") {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      }
      if (sortBy === "rating") return b.rating - a.rating;
      const aYear = a.year ?? 0;
      const bYear = b.year ?? 0;
      return bYear - aYear;
    });
  }, [cards, activeType, selectedRatingBands, sortBy]);

  const displayHandle = profile.handle ? `@${profile.handle}` : "";

  const profileAvatarSrc = normalizeItemImageUrlForNext(profile.image);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] space-y-6 md:pb-8">
        <header className="relative space-y-4">
          <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => router.push("/profile/edit-photo")}
                className="relative mx-auto block h-20 w-20 overflow-hidden rounded-full bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/10"
                aria-label="Edit photo"
              >
                {profileLoading ? (
                  <div className="h-full w-full animate-pulse bg-zinc-300" />
                ) : profileAvatarSrc && !imageError ? (
                  <Image
                    src={profileAvatarSrc}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    sizes="80px"
                    onError={() => setImageError(true)}
                    unoptimized={
                      profileAvatarSrc.startsWith("data:") ||
                      profileAvatarSrc.startsWith("blob:")
                    }
                  />
                ) : null}
              </button>
              {profileLoading ? (
                <>
                  <div className="mx-auto h-4 w-24 rounded bg-zinc-200 animate-pulse" />
                  <div className="mx-auto h-4 w-48 rounded bg-zinc-100 animate-pulse" />
                  <div className="mt-3 flex justify-center gap-8">
                    <div className="h-4 w-8 rounded bg-zinc-100 animate-pulse" />
                    <div className="h-4 w-8 rounded bg-zinc-100 animate-pulse" />
                  </div>
                </>
              ) : (
                <>
                  {displayHandle && (
                    <div className="text-sm font-semibold">{displayHandle}</div>
                  )}
                  <p className="text-sm text-zinc-600">
                    {profile.bio || "Add a short bio so others can get to know you."}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-8 text-sm">
                    {profile.handle ? (
                      <>
                        <Link
                          href={`/profile/${profile.handle}/followers`}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <div className="font-semibold">
                            {profile.followers ?? 0}
                          </div>
                          <div className="text-zinc-500 text-xs">Followers</div>
                        </Link>
                        <Link
                          href={`/profile/${profile.handle}/following`}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <div className="font-semibold">
                            {profile.following ?? 0}
                          </div>
                          <div className="text-zinc-500 text-xs">Following</div>
                        </Link>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="font-semibold">
                            {profile.followers ?? 0}
                          </div>
                          <div className="text-zinc-500 text-xs">Followers</div>
                        </div>
                        <div>
                          <div className="font-semibold">
                            {profile.following ?? 0}
                          </div>
                          <div className="text-zinc-500 text-xs">Following</div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <div ref={profileMenuRef} className="absolute right-0 top-0">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                aria-label="Profile menu"
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
                  <path d="M5 7h14M5 12h14M5 17h14" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-zinc-100 bg-white py-1 text-sm shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/profile/edit-handle");
                    }}
                    className="block w-full px-4 py-2 text-left text-zinc-800 hover:bg-zinc-50"
                  >
                    Edit handle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/profile/edit-photo");
                    }}
                    className="block w-full px-4 py-2 text-left text-zinc-800 hover:bg-zinc-50"
                  >
                    Edit photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/profile/edit-bio");
                    }}
                    className="block w-full px-4 py-2 text-left text-zinc-800 hover:bg-zinc-50"
                  >
                    Edit bio
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="block w-full px-4 py-2 text-left text-red-600 hover:bg-zinc-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
        </header>

        <nav className="flex items-center border-b border-zinc-200 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("rated")}
            className={`-mb-px flex-1 border-b-2 py-3 font-medium transition-colors ${
              activeTab === "rated"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Rated
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lists")}
            className={`-mb-px flex-1 border-b-2 py-3 font-medium transition-colors ${
              activeTab === "lists"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Lists
          </button>
        </nav>

        {activeTab === "rated" ? (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              RATED
            </h2>
            <button
              type="button"
              onClick={() => setSortModalOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Sort"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h4M4 12h4M4 18h4" />
                <path d="M12 6h8M12 12h6M12 18h8" />
              </svg>
            </button>
          </div>

          <div
            className="flex flex-wrap gap-2 text-xs"
            data-profile-keep-menu-open
          >
              {["All", "Films", "Series", "Books"].map((label) => (
              <button
                key={label}
                className={`rounded-full px-3 py-1 ${
                  activeType === label
                    ? "bg-black text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
                onClick={() =>
                  setActiveType(label as "All" | "Films" | "Series" | "Books")
                }
              >
                {label}
                </button>
              ))}
          </div>

          {sortModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
              <div
                className="absolute inset-0 bg-black/50"
                aria-hidden
                onClick={() => setSortModalOpen(false)}
              />
              <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Sort</h2>
                  <button
                    type="button"
                    onClick={() => setSortModalOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mb-4 text-sm font-medium text-zinc-900">Sort By</p>
                <div className="space-y-2">
                  {[
                    { value: "reviewDate" as const, label: "Review Date", sublabel: "Newest first" },
                    { value: "rating" as const, label: "Rating", sublabel: "Highest first" },
                    { value: "publicationYear" as const, label: "Publication Year", sublabel: "Newest first" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSortBy(opt.value)}
                      className={`flex w-full flex-col items-start rounded-xl px-4 py-3 text-left transition-colors ${
                        sortBy === opt.value
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                      }`}
                    >
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className={`text-xs ${sortBy === opt.value ? "text-zinc-300" : "text-zinc-500"}`}>
                        {opt.sublabel}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-blue-600">
                  Sort your feed by review date, rating, or publication year.
                </p>
                <button
                  type="button"
                  onClick={() => setSortModalOpen(false)}
                  className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          <div
            className="flex flex-wrap items-center gap-2 text-xs"
            data-profile-keep-menu-open
          >
            <span className="text-zinc-500 mr-1">Rating</span>
            {ratingOptions.map((label) => {
              const isActive = selectedRatingBands.has(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleRatingBand(label)}
                  className={`rounded-full px-2.5 py-1 transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {reviewsLoading ? (
            <div
              className="grid grid-cols-2 gap-3 pt-4 sm:gap-4"
              data-profile-keep-menu-open
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-zinc-100 animate-pulse">
                  <div className="aspect-[3/4] w-full bg-zinc-200" />
                  <div className="p-2 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-zinc-200" />
                    <div className="h-3 w-1/2 rounded bg-zinc-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div
                className="grid grid-cols-2 gap-3 pt-4 sm:gap-4"
                data-profile-keep-menu-open
              >
                {filteredCards.map((card) => {
                  const cardCoverSrc = normalizeItemImageUrlForNext(card.imageUrl);
                  return (
                  <Link
                    key={card.id}
                    href={`/items/${card.itemId}/reviews/${card.reviewId}`}
                    className="relative block overflow-hidden rounded-2xl bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-300">
                      {cardCoverSrc ? (
                        <Image
                          src={cardCoverSrc}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 45vw, 320px"
                          unoptimized={
                            cardCoverSrc.startsWith("data:") ||
                            cardCoverSrc.startsWith("blob:")
                          }
                        />
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-1.5">
                        <span className="pointer-events-auto rounded-full bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-medium text-white leading-none">
                          {card.type === "SHOW" ? "SERIES" : card.type}
                        </span>
                        <span className="pointer-events-auto rounded-full bg-zinc-900/90 px-2 py-0.5 text-[10px] font-medium text-white">
                          {Number.isInteger(card.rating) ? card.rating : card.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-3">
                      <span className="line-clamp-2 text-sm font-medium text-white">
                        {card.title}
                      </span>
                      <div className="mt-0.5 text-[11px] text-white/80">
                        {formatTimeAgo(card.createdAt)}
                      </div>
                    </div>
                  </Link>
                );
                })}
              </div>

              {filteredCards.length === 0 && (
                <p className="pt-4 text-center text-sm text-zinc-500">
                  {cards.length === 0 ? "No reviews yet." : "No reviews in this filter."}
                </p>
              )}
            </>
          )}
        </section>
        ) : (
          <section className="space-y-4 pt-4">
            <button
              type="button"
              onClick={() => router.push("/lists/new")}
              className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              + Create List
            </button>

            {lists.length === 0 ? (
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-8 text-center">
                <p className="text-sm text-zinc-600">No lists yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {lists.map((list) => (
                  <ProfileListCard key={list.id} list={list} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
