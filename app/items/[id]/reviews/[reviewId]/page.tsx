import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import Link from "next/link";
import { notFound } from "next/navigation";

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

type ReviewDetail = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  user: {
    id: string;
    handle: string | null;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  item: {
    id: string;
    title: string;
    year: number | null;
    type: string;
    imageUrl?: string | null;
  };
};

type ReviewPageData = {
  review: ReviewDetail;
  saved: boolean;
  reviewedByMe: boolean;
};

const offlineReview: ReviewPageData = {
  review: {
    id: "offline-review",
    rating: 9.2,
    body: "Intense and beautiful. Every frame felt like controlled chaos.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    user: {
      id: "u-sarah",
      handle: "sarahkim",
      name: null,
      email: null,
      image: null,
    },
    item: {
      id: "1",
      title: "The Bear",
      year: 2023,
      type: "SHOW",
      imageUrl: null,
    },
  },
  saved: false,
  reviewedByMe: false,
};

export default async function ItemReviewPage({
  params,
}: {
  params: Promise<{ id: string; reviewId: string }>;
}) {
  const { id: itemId, reviewId } = await params;
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";

  let data: ReviewPageData | null = null;

  if (offline) {
    data = offlineReview;
  } else {
    const session = await getServerSession(authOptions);

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { id: true, handle: true, name: true, email: true, image: true } },
        item: { select: { id: true, title: true, year: true, type: true, imageUrl: true } },
      },
    });

    if (!review || review.itemId !== itemId) {
      return notFound();
    }

    let saved = false;
    let reviewedByMe = false;

    if (session?.user?.id) {
      const [savedRow, myReview] = await Promise.all([
        prisma.savedItem.findUnique({
          where: {
            userId_itemId: {
              userId: session.user.id,
              itemId: review.itemId,
            },
          },
        }),
        prisma.review.findUnique({
          where: {
            userId_itemId: {
              userId: session.user.id,
              itemId: review.itemId,
            },
          },
        }),
      ]);

      saved = !!savedRow;
      reviewedByMe = !!myReview;
    }

    data = {
      review: {
        id: review.id,
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt,
        user: review.user
          ? {
              id: review.user.id,
              handle: review.user.handle,
              name: review.user.name,
              email: review.user.email,
              image: review.user.image,
            }
          : null,
        item: {
          id: review.item.id,
          title: review.item.title,
          year: review.item.year ?? null,
          type: review.item.type,
          imageUrl: review.item.imageUrl ?? null,
        },
      },
      saved,
      reviewedByMe,
    };
  }

  if (!data) {
    return notFound();
  }

  const { review, saved, reviewedByMe } = data;
  const item = data.review.item;
  const user = review.user;

  const handle =
    user?.handle != null
      ? `@${user.handle}`
      : user?.name || user?.email || "@user";

  const ratingDisplay =
    Number(review.rating) === Math.floor(review.rating)
      ? review.rating.toString()
      : review.rating.toFixed(1);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header: back (to item reviews list) + item summary + actions */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <Link
              href={`/items/${item.id}/reviews`}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              aria-label="Back to reviews"
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
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex gap-4">
              <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h1 className="text-lg font-semibold text-zinc-900">
                  {item.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  {item.year != null && <span>{item.year}</span>}
                  {item.year != null && <span>•</span>}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                    {item.type === "SHOW" ? "SERIES" : item.type}
                  </span>
                </div>
                <Link
                  href={`/items/${item.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-900"
                >
                  <span>View item page</span>
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/items/${item.id}/review`}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs ${
                reviewedByMe
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
              aria-label="Rate this item"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill={reviewedByMe ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
              </svg>
            </Link>
            <Link
              href={`/items/${item.id}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs ${
                saved
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
              aria-label="Save item (from item page)"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Review by (user) */}
        <section className="space-y-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Review by
          </div>
          <Link
            href={
              user?.handle
                ? `/profile/${user.handle}`
                : "#"
            }
            className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 hover:bg-zinc-100/80"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-600">
                    {(user?.name || user?.email || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900">
                  {handle}
                </div>
                <div className="text-xs text-zinc-500">
                  {formatTimeAgo(review.createdAt)}
                </div>
              </div>
            </div>
            <svg className="h-5 w-5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>

          <div className="space-y-2 pt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Rating
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 py-6 text-center">
              <span className="text-4xl font-semibold tracking-tight text-zinc-900">
                {ratingDisplay}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Reflection
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
              <p className="text-sm text-zinc-800 whitespace-pre-line">
                {review.body || "No written reflection for this review."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
