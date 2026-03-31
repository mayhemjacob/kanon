import { getReviewRatingReactionSummary } from "@/lib/getReviewRatingReactionSummary";
import type { RatingReactionSummary } from "@/lib/reviewRatingReactions";
import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatReviewDate } from "@/lib/date";
import { ReviewBackButton } from "./ReviewBackButton";
import { ReviewEditable } from "./ReviewEditable";
import { ReviewPageActions } from "./ReviewPageActions";
import { ReviewRatingReactions } from "./ReviewRatingReactions";
import { ReviewShareSection } from "./ReviewShareSection";

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
  canEdit: boolean;
  myReviewId?: string;
  reactionSummary: RatingReactionSummary;
};

const emptyReactionSummary: RatingReactionSummary = {
  tooLowCount: 0,
  aboutRightCount: 0,
  tooHighCount: 0,
  currentUserReaction: null,
};

const offlineReview: ReviewPageData = {
  canEdit: false,
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
  reactionSummary: emptyReactionSummary,
};

function isConnectionPoolTimeoutError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2024: timed out fetching a new connection from the pool
    if (err.code === "P2024") return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Unable to check out connection from the pool due to timeout/i.test(msg) ||
    /Timed out fetching a new connection from the connection pool/i.test(msg) ||
    /MaxClientsInSessionMode: max clients reached/i.test(msg)
  );
}

export default async function ItemReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; reviewId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { id: itemId, reviewId } = await params;
  const query = searchParams ? await searchParams : {};
  const fromHome = query.from === "home";
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";
  const session = await getServerSession(authOptions);

  let data: ReviewPageData | null = null;

  if (offline) {
    data = offlineReview;
  } else {
    try {
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
      let myReviewId: string | undefined;

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
        myReviewId = myReview?.id;
      }

      const canEdit = !!(session?.user?.id && review.userId === session.user.id);

      const reactionSummary = await getReviewRatingReactionSummary(
        reviewId,
        session?.user?.id
      );

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
        canEdit,
        myReviewId,
        reactionSummary,
      };
    } catch (err) {
      if (isConnectionPoolTimeoutError(err)) {
        return (
          <main className="min-h-screen bg-white">
            <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
              <p className="text-sm text-zinc-600">
                We could not load this review right now. Please try again in a moment.
              </p>
            </div>
          </main>
        );
      }
      throw err;
    }
  }

  if (!data) {
    return notFound();
  }

  const { review, saved, reviewedByMe, canEdit, myReviewId, reactionSummary } =
    data;
  const item = data.review.item;
  const user = review.user;
  const itemCoverSrc = normalizeItemImageUrlForNext(item.imageUrl);
  const userAvatarSrc = normalizeItemImageUrlForNext(user?.image);

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
      <div className="mx-auto max-w-2xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8 md:pb-8">
        {/* Header: back arrow, then item summary + actions */}
        <div className="mb-4">
          <ReviewBackButton itemId={item.id} fromHome={fromHome} />

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 gap-4">
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                {itemCoverSrc ? (
                  <Image
                    src={itemCoverSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized={
                      itemCoverSrc.startsWith("data:") ||
                      itemCoverSrc.startsWith("blob:")
                    }
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
            <ReviewPageActions
              itemId={item.id}
              saved={saved}
              reviewedByMe={reviewedByMe}
              myReviewId={myReviewId}
            />
          </div>
        </div>

        {/* Review by (user) */}
        <section className="space-y-2">
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
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                {userAvatarSrc ? (
                  <Image
                    src={userAvatarSrc}
                    alt=""
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                    sizes="36px"
                    unoptimized={
                      userAvatarSrc.startsWith("data:") ||
                      userAvatarSrc.startsWith("blob:")
                    }
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

          {canEdit ? (
            <ReviewEditable
              reviewId={review.id}
              initialRating={review.rating}
              initialBody={review.body}
              reactionSummary={reactionSummary}
              reactionSignedIn={!!session?.user?.id}
              reactionOffline={offline}
            />
          ) : (
            <>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Rating
                  </div>
                  <ReviewRatingReactions
                    reviewId={review.id}
                    initialSummary={reactionSummary}
                    signedIn={!!session?.user?.id}
                    offline={offline}
                  />
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 py-6 text-center">
                  <span className="text-4xl font-semibold tracking-tight text-zinc-900">
                    {ratingDisplay}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Reflection
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                  <p className="text-sm text-zinc-800 whitespace-pre-line">
                    {review.body || "No written reflection for this review."}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Reviewed on
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
              <p className="text-sm text-zinc-800">
                {formatReviewDate(review.createdAt)}
              </p>
            </div>
          </div>

          {!offline && session?.user?.id ? (
            <ReviewShareSection
              reviewId={review.id}
              itemTitle={item.title}
              itemImageUrl={item.imageUrl ?? null}
              rating={review.rating}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
