import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatReviewDate } from "@/lib/date";
import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";
import {
  itemTypeLabel,
  loadPublicReviewShare,
  reviewerDisplayLabel,
} from "@/lib/publicReview/loadPublicReviewShare";

function displayName(handle: string | null, name: string | null): string {
  return reviewerDisplayLabel(handle, name);
}

function imageNeedsUnoptimized(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}

function clipMeta(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function metaDescriptionFromReview(body: string | null): string {
  const t = body?.replace(/\s+/g, " ").trim();
  if (t && t.length > 0) {
    return clipMeta(t, 160);
  }
  return "A review on Kanon";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicShareId: string }>;
}): Promise<Metadata> {
  const { publicShareId } = await params;
  const token = publicShareId?.trim() ?? "";
  const data = await loadPublicReviewShare(token);

  if (!data) {
    return {
      title: "Review · Kanon",
      description: "A review on Kanon",
    };
  }

  const reviewer = reviewerDisplayLabel(data.user.handle, data.user.name);
  const title = clipMeta(`${data.item.title} · ${reviewer} · Kanon`, 72);
  const description = clipMeta(metaDescriptionFromReview(data.body), 200);
  const ogImagePath = `/r/${encodeURIComponent(token)}/opengraph-image`;
  const type = itemTypeLabel(data.item.type);
  const yearBit = data.item.year != null ? `${data.item.year} · ` : "";
  const ogTitle = clipMeta(`${data.item.title} · Review`, 64);
  const ogDesc = clipMeta(`${yearBit}${type} · ${reviewer}`, 200);
  const ogAlt = clipMeta(`${data.item.title} — ${reviewer}`, 120);

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      type: "article",
      images: [
        {
          url: ogImagePath,
          width: 1200,
          height: 630,
          alt: ogAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImagePath],
    },
  };
}

export default async function PublicSharedReviewPage({
  params,
}: {
  params: Promise<{ publicShareId: string }>;
}) {
  const { publicShareId } = await params;
  const token = publicShareId?.trim();
  if (!token || token.length < 8) {
    notFound();
  }

  const review = await loadPublicReviewShare(token);

  if (!review) {
    notFound();
  }

  const user = review.user;
  const item = review.item;
  const username = displayName(user?.handle ?? null, user?.name ?? null);
  const heroCoverSrc = normalizeItemImageUrlForNext(item.imageUrl);
  const reviewerAvatarSrc = normalizeItemImageUrlForNext(user?.image ?? null);

  const rating = review.rating;
  const ratingDisplay =
    Number(rating) === Math.floor(rating)
      ? String(rating)
      : rating.toFixed(1);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-10 sm:px-8 sm:pt-12 md:max-w-3xl md:pb-20">
        {/* Kanon header */}
        <header className="mb-10 flex items-center justify-between gap-4 border-b border-zinc-100 pb-6 md:mb-12">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900 hover:text-zinc-700"
          >
            Kanon
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 sm:h-11 sm:px-6 sm:text-[15px]"
          >
            Join Kanon
          </Link>
        </header>

        {/* Reviewer */}
        <section className="mb-8 md:mb-10">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Review by
          </p>
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3.5">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-200">
              {reviewerAvatarSrc ? (
                <Image
                  src={reviewerAvatarSrc}
                  alt=""
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                  sizes="44px"
                  unoptimized={imageNeedsUnoptimized(reviewerAvatarSrc)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-zinc-600">
                  {username.replace(/^@/, "").charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <p className="text-[17px] font-medium text-zinc-900">{username}</p>
          </div>
        </section>

        {/* Hero: cover + title / meta / rating */}
        <section className="mb-10 md:mb-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
            <div className="mx-auto w-[min(100%,200px)] shrink-0 md:mx-0 md:w-[180px] md:shrink-0">
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-100 shadow-md">
                {heroCoverSrc ? (
                  <Image
                    src={heroCoverSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 200px, 180px"
                    unoptimized={imageNeedsUnoptimized(heroCoverSrc)}
                    priority
                  />
                ) : null}
              </div>
            </div>

            <div className="min-w-0 w-full space-y-5 md:w-[180px] md:shrink-0">
              <div>
                <h1 className="text-2xl font-medium leading-tight tracking-tight text-zinc-900 sm:text-[26px] md:text-2xl md:leading-snug">
                  {item.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-zinc-500">
                  {item.year != null ? (
                    <span className="text-[15px]">{item.year}</span>
                  ) : null}
                  {item.year != null ? (
                    <span className="text-zinc-300" aria-hidden>
                      •
                    </span>
                  ) : null}
                  <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
                    {itemTypeLabel(item.type)}
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Rating
                </p>
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-6 py-8">
                  <div className="text-center">
                    <span className="text-[42px] font-light tabular-nums tracking-tight text-zinc-900">
                      {ratingDisplay}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reflection */}
        <section className="mb-10">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Reflection
          </p>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-5 sm:px-6 sm:py-6">
            <p className="text-[17px] leading-relaxed text-zinc-900 whitespace-pre-line">
              {review.body?.trim()
                ? review.body
                : "No written reflection for this review."}
            </p>
          </div>
        </section>

        {/* Reviewed on */}
        <section className="mb-12 md:mb-14">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Reviewed on
          </p>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4">
            <p className="text-[15px] text-zinc-700">
              {formatReviewDate(review.createdAt)}
            </p>
          </div>
        </section>

        {/* CTA */}
        <aside className="rounded-2xl border border-zinc-200 bg-zinc-50/60 px-6 py-10 text-center sm:px-10">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Create your own taste profile
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-zinc-600 sm:text-[15px]">
            Track films, series, and books. Share your perspective.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-[15px] font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Join Kanon
          </Link>
        </aside>
      </div>
    </main>
  );
}
