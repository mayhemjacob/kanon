import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import Link from "next/link";
import { ItemActions } from "../ItemActions";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString();
}

type ReviewWithUser = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  user: {
    handle: string | null;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type ItemWithReviews = {
  id: string;
  title: string;
  year?: number | null;
  imageUrl?: string | null;
  reviews: ReviewWithUser[];
};

const offlineReviewsData: ItemWithReviews = {
  id: "1",
  title: "Dune: Part Two",
  year: 2024,
  imageUrl: null,
  reviews: [
    {
      id: "r1",
      rating: 9,
      body: "Visually stunning. Made me feel small in the best way possible.",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      user: { handle: "yourhandle", name: null, email: null, image: null },
    },
    {
      id: "r2",
      rating: 8.5,
      body: "Visually stunning. Made me feel small in the best way possible.",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      user: { handle: "alexchen", name: null, email: null, image: null },
    },
  ],
};

export default async function ItemReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";
  const session = await getServerSession(authOptions);

  let item: ItemWithReviews | null = null;
  let saved = false;
  let reviewed = false;
  let myReviewId: string | undefined;

  if (offline) {
    item = { ...offlineReviewsData, id };
    saved = false;
    reviewed = true;
    myReviewId = "r1";
  } else {
    try {
      const [fetched, savedRow, myReview] = await Promise.all([
        prisma.item.findUnique({
          where: { id },
          include: {
            reviews: {
              include: { user: true },
              orderBy: { createdAt: "desc" },
            },
          },
        }),
        session?.user?.id
          ? prisma.savedItem.findUnique({
              where: {
                userId_itemId: { userId: session.user.id, itemId: id },
              },
            })
          : null,
        session?.user?.id
          ? prisma.review.findUnique({
              where: {
                userId_itemId: { userId: session.user.id, itemId: id },
              },
            })
          : null,
      ]);
      item = fetched;
      if (session?.user?.id) {
        saved = !!savedRow;
        reviewed = !!myReview;
        myReviewId = myReview?.id;
      }
    } catch {
      return (
        <main className="min-h-screen bg-white">
          <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-6 flex items-center gap-3">
              <Link
                href={`/items/${id}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="Back to item"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Reviews</h1>
            </div>
            <p className="text-sm text-zinc-500">
              Unable to load reviews. Make sure the database is running and DATABASE_URL is set.
            </p>
            <Link href={`/items/${id}`} className="mt-4 inline-block text-sm font-medium text-zinc-900 underline">
              Back to item
            </Link>
          </div>
        </main>
      );
    }
  }

  if (!item) {
    return notFound();
  }

  const ratingCount = item.reviews.length;
  const averageRating =
    ratingCount === 0
      ? null
      : Number(
          (
            item.reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
          ).toFixed(1)
        );

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Top nav: Back + Reviews title */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/items/${item.id}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Back to item"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Reviews
          </h1>
        </div>

        {/* Item summary */}
        <div className="mb-8 flex gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
          <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-200">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-zinc-900">
                {item.title}
                {item.year != null && (
                  <span className="font-normal text-zinc-500"> ({item.year})</span>
                )}
              </h2>
              <ItemActions
                itemId={item.id}
                saved={saved}
                reviewed={reviewed}
                myReviewId={myReviewId}
                variant="icons"
              />
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1 font-semibold text-zinc-900">
                <svg
                  className="h-4 w-4 text-zinc-700"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
                </svg>
                {averageRating ?? "–"}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-500">
                {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          </div>
        </div>

        {/* Review list */}
        <div className="space-y-0 divide-y divide-zinc-100">
          {item.reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No reviews yet.
            </p>
          ) : (
            item.reviews.map((review) => {
              const handle = review.user?.handle
                ? `@${review.user.handle}`
                : review.user?.name || review.user?.email || "User";
              const profileHref = review.user?.handle
                ? `/profile/${review.user.handle}`
                : "#";
              return (
                <div
                  key={review.id}
                  className="flex gap-4 py-5 first:pt-0"
                >
                  <Link
                    href={profileHref}
                    className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200 hover:opacity-90"
                  >
                    {review.user?.image ? (
                      <img
                        src={review.user.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-medium text-zinc-600">
                        {(review.user?.name || review.user?.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <Link
                    href={`/items/${item.id}/reviews/${review.id}`}
                    className="min-w-0 flex-1 rounded-lg hover:bg-zinc-50 -mx-1 px-1 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-sm font-semibold text-zinc-900">
                          {handle}
                        </span>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {formatTimeAgo(review.createdAt)}
                        </div>
                      </div>
                      <span className="text-lg font-semibold text-zinc-900 tabular-nums">
                        {Number(review.rating) === Math.floor(review.rating)
                          ? review.rating
                          : review.rating.toFixed(1)}
                      </span>
                    </div>
                    {review.body ? (
                      <p className="mt-2 text-sm text-zinc-700">
                        {review.body}
                      </p>
                    ) : null}
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
