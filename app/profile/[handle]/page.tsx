"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ProfileData = {
  handle: string;
  bio: string;
  followers: number;
  following: number;
  cards: { id: string; itemId: string; reviewId: string; type: string; rating: number; title: string }[];
};

const mockProfilesByHandle: Record<string, ProfileData> = {
  alexchen: {
    handle: "@alexchen",
    bio: "Cinephile obsessed with cinematography and sound design.",
    followers: 234,
    following: 189,
    cards: [
      { id: "1", itemId: "1", reviewId: "r1", type: "FILM", rating: 9, title: "Dune: Part Two" },
      { id: "2", itemId: "2", reviewId: "r2", type: "SHOW", rating: 10, title: "The Bear" },
      { id: "3", itemId: "3", reviewId: "r3", type: "BOOK", rating: 8, title: "Tomorrow, and Tomorrow, and Tomorrow" },
    ],
  },
  sarahkim: {
    handle: "@sarahkim",
    bio: "TV drama enthusiast. Always binging something new.",
    followers: 156,
    following: 98,
    cards: [
      { id: "2", itemId: "2", reviewId: "r2", type: "SHOW", rating: 10, title: "The Bear" },
      { id: "4", itemId: "4", reviewId: "r4", type: "FILM", rating: 9, title: "Past Lives" },
    ],
  },
  mikej: {
    handle: "@mikej",
    bio: "Bookworm and gamer. Love stories about connection.",
    followers: 89,
    following: 120,
    cards: [
      { id: "3", itemId: "3", reviewId: "r3", type: "FILM", rating: 8, title: "Past Lives" },
      { id: "1", itemId: "1", reviewId: "r1", type: "FILM", rating: 9, title: "Dune: Part Two" },
    ],
  },
  mikejones: {
    handle: "@mikejones",
    bio: "Bookworm and gamer. Love stories about connection.",
    followers: 89,
    following: 120,
    cards: [
      { id: "3", itemId: "3", reviewId: "r3", type: "FILM", rating: 8, title: "Past Lives" },
      { id: "1", itemId: "1", reviewId: "r1", type: "FILM", rating: 9, title: "Dune: Part Two" },
    ],
  },
  emilyw: {
    handle: "@emilyw",
    bio: "Foreign films and indie books. The weirder, the better.",
    followers: 312,
    following: 201,
    cards: [
      { id: "3", itemId: "3", reviewId: "r3", type: "BOOK", rating: 8, title: "Tomorrow, and Tomorrow, and Tomorrow" },
      { id: "4", itemId: "4", reviewId: "r4", type: "FILM", rating: 9, title: "Past Lives" },
    ],
  },
  emilywang: {
    handle: "@emilywang",
    bio: "Foreign films and indie books. The weirder, the better.",
    followers: 312,
    following: 201,
    cards: [
      { id: "3", itemId: "3", reviewId: "r3", type: "BOOK", rating: 8, title: "Tomorrow, and Tomorrow, and Tomorrow" },
      { id: "4", itemId: "4", reviewId: "r4", type: "FILM", rating: 9, title: "Past Lives" },
    ],
  },
  davidl: {
    handle: "@davidl",
    bio: "Cozy mysteries and feel-good content.",
    followers: 67,
    following: 145,
    cards: [
      { id: "5", itemId: "5", reviewId: "r5", type: "SHOW", rating: 7, title: "Succession" },
    ],
  },
  davidlee: {
    handle: "@davidlee",
    bio: "Cozy mysteries and feel-good content.",
    followers: 67,
    following: 145,
    cards: [
      { id: "5", itemId: "5", reviewId: "r5", type: "SHOW", rating: 7, title: "Succession" },
    ],
  },
  jessm: {
    handle: "@jessm",
    bio: "Sharp dialogue, complex characters, prestige TV.",
    followers: 178,
    following: 92,
    cards: [
      { id: "6", itemId: "6", reviewId: "r6", type: "FILM", rating: 6, title: "The Midnight Library" },
    ],
  },
  jessicamartinez: {
    handle: "@jessicamartinez",
    bio: "Sharp dialogue, complex characters, prestige TV.",
    followers: 178,
    following: 92,
    cards: [
      { id: "6", itemId: "6", reviewId: "r6", type: "FILM", rating: 6, title: "The Midnight Library" },
    ],
  },
  chrisp: {
    handle: "@chrisp",
    bio: "Sci-fi and thrillers.",
    followers: 203,
    following: 167,
    cards: [
      { id: "7", itemId: "7", reviewId: "r7", type: "SHOW", rating: 7, title: "Severance" },
    ],
  },
};

const defaultCards = [
  { id: "1", itemId: "1", reviewId: "r1", type: "FILM", rating: 9, title: "Dune: Part Two" },
  { id: "2", itemId: "2", reviewId: "r2", type: "SHOW", rating: 10, title: "The Bear" },
  { id: "3", itemId: "3", reviewId: "r3", type: "BOOK", rating: 8, title: "Tomorrow, and Tomorrow, and Tomorrow" },
];

function getProfile(handleSlug: string): ProfileData {
  const key = handleSlug.toLowerCase().replace(/^@/, "");
  const found = mockProfilesByHandle[key];
  if (found) return found;
  return {
    handle: `@${key}`,
    bio: "No bio yet.",
    followers: 0,
    following: 0,
    cards: defaultCards,
  };
}

export default function ProfileByHandlePage() {
  const params = useParams();
  const router = useRouter();
  const handleSlug = typeof params.handle === "string" ? params.handle : "";
  const profile = getProfile(handleSlug);
  const [activeType, setActiveType] = useState<"All" | "Films" | "Shows" | "Books">("All");
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchFollowStatus = useCallback(async () => {
    if (!handleSlug) return;
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(handleSlug)}/follow`);
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
      }
    } catch {
      setFollowing(false);
    }
  }, [handleSlug]);

  useEffect(() => {
    fetchFollowStatus();
  }, [fetchFollowStatus]);

  const handleFollowToggle = useCallback(async () => {
    setFollowing((prev) => !prev);
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(handleSlug)}/follow`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
      } else {
        setFollowing((prev) => !prev);
      }
    } catch {
      setFollowing((prev) => !prev);
    } finally {
      setFollowLoading(false);
    }
  }, [handleSlug]);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        {/* Back button: top left of main content (mobile and desktop) */}
        <div className="-mt-2 -mx-2 mb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center h-10 w-10 rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Go back"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <header className="text-center space-y-2">
          <div className="mx-auto h-20 w-20 rounded-full bg-zinc-200" />
          <div className="text-sm font-semibold">{profile.handle}</div>
          <p className="text-sm text-zinc-600">{profile.bio}</p>
          <div className="mt-3 flex items-center justify-center gap-8 text-sm">
            <div>
              <div className="font-semibold">{profile.followers}</div>
              <div className="text-zinc-500 text-xs">Followers</div>
            </div>
            <div>
              <div className="font-semibold">{profile.following}</div>
              <div className="text-zinc-500 text-xs">Following</div>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`rounded-full px-8 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                following
                  ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          </div>
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {["All", "Films", "Shows", "Books"].map((label) => (
              <button
                key={label}
                className={`rounded-full px-3 py-1 ${
                  activeType === label
                    ? "bg-black text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
                onClick={() =>
                  setActiveType(label as "All" | "Films" | "Shows" | "Books")
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-500 mr-1">Rating</span>
            {[10, 9, 8, 7, 6, 5, 4, "≤3"].map((label, i) => (
              <button
                key={label}
                className={`rounded-full px-2.5 py-1 ${
                  i === 0
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            {profile.cards.map((card) => (
              <Link
                key={card.id}
                href={`/items/${card.itemId}/reviews/${card.reviewId}`}
                className="rounded-2xl bg-zinc-900 text-white p-2 h-40 flex flex-col justify-between hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-start justify-between text-xs">
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5">
                    {card.type}
                  </span>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5">
                    {card.rating}
                  </span>
                </div>
                <div className="text-sm font-medium">{card.title}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
