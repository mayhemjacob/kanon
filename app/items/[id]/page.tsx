import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import Image from "next/image";
import Link from "next/link";
import { ItemActions } from "./ItemActions";
import { ItemDetailsEditable } from "./ItemDetailsEditable";
import { ItemPoster } from "./ItemPoster";
import { ItemTitleEditable } from "./ItemTitleEditable";

type ItemType = "FILM" | "SHOW" | "BOOK";

interface ItemPageProps {
  params: Promise<{ id: string }>;
}

interface ItemViewModel {
  id: string;
  title: string;
  year: number | null;
  type: ItemType;
  imageUrl: string | null;
  averageRating: number | null;
  ratingCount: number;
  director: string | null;
  description: string | null;
  tags: string[];
}

const offlineSimilar: ItemViewModel[] = [
  { id: "bear", title: "The Bear", year: 2023, type: "SHOW", imageUrl: null, averageRating: 10, ratingCount: 12, director: null, description: null, tags: [] },
  { id: "tomorrow", title: "Tomorrow, and Tomorrow, and Tomorrow", year: 2022, type: "BOOK", imageUrl: null, averageRating: 8, ratingCount: 8, director: null, description: null, tags: [] },
  { id: "past-lives", title: "Past Lives", year: 2023, type: "FILM", imageUrl: null, averageRating: 9, ratingCount: 6, director: null, description: null, tags: [] },
  { id: "succession", title: "Succession", year: 2023, type: "SHOW", imageUrl: null, averageRating: 10, ratingCount: 20, director: null, description: null, tags: [] },
];

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params;
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";
  const session = await getServerSession(authOptions);

  let itemVm: ItemViewModel | null = null;
  let similar: ItemViewModel[] = [];
  let saved = false;
  let reviewed = false;
  let myReviewId: string | undefined;

  if (offline) {
    itemVm = {
      id,
      title: "Dune: Part Two",
      year: 2024,
      type: "FILM",
      imageUrl: null,
      averageRating: 9,
      ratingCount: 2,
      director: "Denis Villeneuve",
      description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
      tags: ["Sci-Fi", "Adventure", "Drama"],
    };
    similar = offlineSimilar;
  } else {
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        reviews: {
          select: { id: true, userId: true, rating: true },
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
      const myReview = item.reviews.find((r) => r.userId === session.user.id);
      reviewed = !!myReview;
      myReviewId = myReview?.id;
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
      imageUrl: item.imageUrl ?? null,
      averageRating,
      ratingCount,
      director: item.director ?? null,
      description: item.description ?? null,
      tags: item.tags ?? [],
    };

    const similarItems = await prisma.item.findMany({
      where: { id: { not: item.id } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        imageUrl: true,
        reviews: { select: { rating: true } },
      },
    });

    similar = similarItems.map((s) => {
      const count = s.reviews.length;
      const avg =
        count === 0
          ? null
          : Number(
              (
                s.reviews.reduce((sum, r) => sum + r.rating, 0) / count
              ).toFixed(1)
            );

      return {
        id: s.id,
        title: s.title,
        year: s.year ?? null,
        type: s.type as ItemType,
        imageUrl: s.imageUrl ?? null,
        averageRating: avg,
        ratingCount: count,
        director: null,
        description: null,
        tags: [],
      };
    });
  }

  if (!itemVm) {
    return notFound();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-20 sm:px-6 sm:py-8 sm:pb-8">
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
        <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-start">
          <ItemPoster
            itemId={itemVm.id}
            title={itemVm.title}
            imageUrl={itemVm.imageUrl}
          />

          <div className="min-w-0 flex-1">
            <ItemTitleEditable
              itemId={itemVm.id}
              title={itemVm.title}
              canEdit={!!session?.user?.id}
            />

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {itemVm.year && <span>{itemVm.year}</span>}
              {itemVm.year && <span>•</span>}
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700">
                {itemVm.type === "FILM"
                  ? "FILM"
                  : itemVm.type === "SHOW"
                  ? "SERIES"
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

            <ItemActions itemId={itemVm.id} saved={saved} reviewed={reviewed} myReviewId={myReviewId} />
          </div>
        </div>

        {/* Director, Description, Tags - editable by anyone */}
        <ItemDetailsEditable
          itemId={itemVm.id}
          itemType={itemVm.type}
          director={itemVm.director}
          description={itemVm.description}
          tags={itemVm.tags}
          canEdit={!!session?.user?.id}
        />

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

        {/* Similar content */}
        <section className="mt-10 min-w-0">
          <h2 className="text-sm font-medium text-zinc-900">Similar Content</h2>
          <div className="mt-4 flex min-w-0 gap-4 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {similar.map((item) => {
              const simCover = normalizeItemImageUrlForNext(item.imageUrl);
              return (
              <Link key={item.id} href={`/items/${item.id}`} className="w-32 shrink-0 sm:w-36">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-200">
                  {simCover ? (
                    <Image
                      src={simCover}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 128px, 144px"
                      unoptimized={
                        simCover.startsWith("data:") ||
                        simCover.startsWith("blob:")
                      }
                    />
                  ) : null}
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-start p-1.5">
                    <span className="pointer-events-auto rounded-full bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-medium text-white leading-none">
                      {item.type === "SHOW" ? "SERIES" : item.type}
                    </span>
                  </div>
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
                <div className="mt-2 min-w-0 break-words text-xs font-medium text-zinc-900">
                  {item.title}
                </div>
                {item.year && (
                  <div className="pb-1 text-[11px] text-zinc-500">{item.year}</div>
                )}
              </Link>
            );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
