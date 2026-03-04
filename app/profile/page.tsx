"use client";

import Link from "next/link";
import { useState } from "react";

const mockProfile = {
  handle: "@jacob",
  bio: "Film lover. Reader. Always searching for stories that move me.",
  followers: 234,
  following: 189,
};

const mockCards = [
  { id: "1", itemId: "1", reviewId: "r1", type: "FILM", rating: 9, title: "Dune: Part Two" },
  { id: "2", itemId: "2", reviewId: "r2", type: "SHOW", rating: 10, title: "The Bear" },
  { id: "3", itemId: "3", reviewId: "r3", type: "BOOK", rating: 8, title: "Tomorrow, and Tomorrow, and Tomorrow" },
];

export default function ProfilePage() {
  const [activeType, setActiveType] = useState<"All" | "Films" | "Shows" | "Books">("All");

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <header className="text-center space-y-2">
          <div className="mx-auto h-20 w-20 rounded-full bg-zinc-200" />
          <div className="text-sm font-semibold">{mockProfile.handle}</div>
          <p className="text-sm text-zinc-600">{mockProfile.bio}</p>
          <div className="mt-3 flex items-center justify-center gap-8 text-sm">
            <div>
              <div className="font-semibold">{mockProfile.followers}</div>
              <div className="text-zinc-500 text-xs">Followers</div>
            </div>
            <div>
              <div className="font-semibold">{mockProfile.following}</div>
              <div className="text-zinc-500 text-xs">Following</div>
            </div>
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
            {mockCards.map((card) => (
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

