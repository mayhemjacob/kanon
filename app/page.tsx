import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { formatTimeAgo } from "@/lib/date";
import { HomePageClient, type HomeReview } from "./HomePageClient";
import { getHomeFeed } from "@/lib/feed";
import { Suspense } from 'react';
import FeedError from "./feedError";
/** Home-only default share image (not inherited via root layout — avoids overriding Taste Match OG). */
export const metadata: Metadata = {
  openGraph: {
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kanon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

const offlineCreated1 = new Date(Date.now() - 2 * 60 * 60 * 1000);
const offlineCreated2 = new Date(Date.now() - 5 * 60 * 60 * 1000);

const offlineReviews: HomeReview[] = [
  {
    id: "1",
    itemId: "1",
    userName: "alexchen",
    avatarInitial: "A",
    userImage: null,
    rating: 9.2,
    itemType: "FILM",
    itemImageUrl: null,
    title: "Dune: Part Two",
    tags: ["Sci-Fi", "Adventure", "Drama"],
    body: "Visually stunning. Made me feel small in the best way possible.",
    timeAgo: formatTimeAgo(offlineCreated1),
    createdAt: offlineCreated1,
    year: 2024,
  },
  {
    id: "2",
    itemId: "2",
    userName: "sarahkim",
    avatarInitial: "S",
    userImage: null,
    rating: 9.8,
    itemType: "SHOW",
    itemImageUrl: null,
    title: "The Bear",
    tags: ["Drama", "Comedy", "Contemporary"],
    body: "Intense and beautiful. Every frame felt like controlled chaos.",
    timeAgo: formatTimeAgo(offlineCreated2),
    createdAt: offlineCreated2,
    year: 2023,
  },
];

async function withTimeoutFallback<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });
  const result = await Promise.race([promise.catch(() => fallback), timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

function FeedSkeleton() {
  return (
    <section className="space-y-4 pb-20">
      {[1, 2, 3].map((i) => (
        <article key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="space-y-1">
                  <div className="h-3 w-16 rounded bg-zinc-200 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-zinc-100 animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-4 w-4 rounded bg-zinc-100 animate-pulse" />
                  <div className="h-4 w-4 rounded bg-zinc-100 animate-pulse" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
                <div className="aspect-[3/4] w-20 rounded-lg bg-zinc-200 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-zinc-200 animate-pulse" />
                  <div className="h-8 w-12 rounded bg-zinc-200 animate-pulse" />
                  <div className="h-4 w-full rounded bg-zinc-100 animate-pulse" />
                  <div className="h-4 w-4/5 rounded bg-zinc-100 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}


export default async function Home() {
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";

  if (offline) {
    return <HomePageClient reviews={offlineReviews} initialStatus={{}} />;
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      redirect("/login");
    }

    try
    {
    
      const { reviews, initialStatus } = await withTimeoutFallback(
        getHomeFeed(session?.user?.id),
        7000,
        { reviews: [] as HomeReview[], initialStatus: {} as Record<string, { saved: boolean; reviewed: boolean; reviewId?: string }> }
      );

      return (
        <Suspense fallback={<FeedSkeleton />}>
          <HomePageClient
            reviews={reviews}
            initialStatus={initialStatus}
            initialUnread={0}
          />
        </Suspense>
      );
    } catch (e) {
      return (
        <FeedError/>
      );
    }

  } catch {
    redirect("/login");
  }
}
