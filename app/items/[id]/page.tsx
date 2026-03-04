import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import Link from "next/link";
import { ReviewForm } from "./review-form";
import { ItemActions } from "./ItemActions";

type ItemType = "FILM" | "SHOW" | "BOOK";

interface ItemPageProps {
  params: Promise<{ id: string }>;
}

interface ItemViewModel {
  id: string;
  title: string;
  year: number | null;
  type: ItemType;
  averageRating: number | null;
  ratingCount: number;
  tags: string[];
}

const offlineSimilar: ItemViewModel[] = [
  {
    id: "bear",
    title: "The Bear",
    year: 2023,
    type: "SHOW",
    averageRating: 10,
    ratingCount: 12,
    tags: [],
  },
  {
    id: "tomorrow",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    year: 2022,
    type: "BOOK",
    averageRating: 8,
    ratingCount: 8,
    tags: [],
  },
  {
    id: "past-lives",
    title: "Past Lives",
    year: 2023,
    type: "FILM",
    averageRating: 9,
    ratingCount: 6,
    tags: [],
  },
  {
    id: "succession",
    title: "Succession",
    year: 2023,
    type: "SHOW",
    averageRating: 10,
    ratingCount: 20,
    tags: [],
  },
];

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params;
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";

  let itemVm: ItemViewModel | null = null;
  let similar: ItemViewModel[] = [];
  let reviews:
    | {
        id: string;
        rating: number;
        body: string | null;
        userName: string;
      }[]
    | null = null;
  let saved = false;
  let reviewed = false;

  if (offline) {
    itemVm = {
      id,
      title: "Dune: Part Two",
      year: 2024,
      type: "FILM",
      averageRating: 9,
      ratingCount: 2,
      tags: ["Sci-Fi", "Adventure", "Drama"],
    };
    similar = offlineSimilar;
  } else {
    const session = await getServerSession(authOptions);
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!item) {
      return notFound();
    }

    if (session?.user?.id) {
      const savedRow = await prisma.savedItem.findUnique({
        where: {
          userId_itemId: { userId: session.user.id, itemId: item.id },
        },
      });
      saved = !!savedRow;
      reviewed = item.reviews.some((r) => r.userId === session.user.id);
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

    itemVm = {
      id: item.id,
      title: item.title,
      year: item.year ?? null,
      type: item.type as ItemType,
      averageRating,
      ratingCount,
      tags: [], // tags/genres can be added later
    };

    similar = []; // TODO: add real similar content later

    reviews = item.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      userName: review.user?.name || review.user?.email || "User",
    }));
  }

  if (!itemVm) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Top bar */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
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
          </Link>
        </div>

        {/* Main item header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto w-40 sm:mx-0 sm:w-48">
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900/90" />
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {itemVm.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {itemVm.year && <span>{itemVm.year}</span>}
              {itemVm.year && <span>•</span>}
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700">
                {itemVm.type === "FILM"
                  ? "FILM"
                  : itemVm.type === "SHOW"
                  ? "SHOW"
                  : "BOOK"}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4 text-zinc-900"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
                </svg>
                <span className="text-2xl font-semibold">
                  {itemVm.averageRating ?? "–"}
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                ({itemVm.ratingCount})
              </span>
            </div>

            <ItemActions itemId={itemVm.id} saved={saved} reviewed={reviewed} />

            {itemVm.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                {itemVm.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6">
              <Link
                href={`/items/${itemVm.id}/reviews`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
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
                  <rect x="5" y="6" width="14" height="12" rx="1.5" />
                  <path d="M9 10h6M9 13h3" />
                </svg>
                View {itemVm.ratingCount || 0} Reviews
              </Link>
            </div>
          </div>
        </div>

        {/* Reviews section (online mode only) */}
        {!offline && reviews && (
          <section className="mt-10 space-y-4">
            <ReviewForm itemId={itemVm.id} />
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-900">Reviews</h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-zinc-500">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-4"
                    >
                      <div className="text-sm font-medium">
                        {review.userName}
                      </div>
                      <div className="mt-1 text-sm text-zinc-600">
                        Rating {review.rating}/10
                      </div>
                      {review.body ? (
                        <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">
                          {review.body}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Similar content */}
        <section className="mt-10">
          <h2 className="text-sm font-medium text-zinc-900">Similar Content</h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
            {similar.map((item) => (
              <div key={item.id} className="w-32 shrink-0 sm:w-36">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-200">
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/80 px-2 py-1 text-[10px] font-medium text-white">
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3.5 9.6 9H4.5l4.1 3.1L6.8 18.5 12 15.3l5.2 3.2-1.8-6.4 4.1-3.1h-5.1L12 3.5z" />
                    </svg>
                    <span>{item.averageRating ?? "–"}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs font-medium text-zinc-900">
                  {item.title}
                </div>
                {item.year && (
                  <div className="text-[11px] text-zinc-500">{item.year}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
