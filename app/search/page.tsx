import { prisma } from "@/lib/prisma";
import type { ItemCardItem, ItemType } from "@/app/components/ItemCard";
import { DiscoverPageClient } from "./DiscoverPageClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import type { ItemStatus } from "@/app/api/items/status/route";

export type DiscoverPerson = {
  id: string;
  handle: string;
  bio: string | null;
  image: string | null;
};

const offlineDiscoverItems: ItemCardItem[] = [
  { id: "1", title: "Dune: Part Two", year: 2024, type: "FILM", averageRating: 9.2, ratingCount: 2, tags: ["Sci-Fi", "Adventure"], imageUrl: null },
  { id: "2", title: "The Bear", year: 2023, type: "SHOW", averageRating: 9.8, ratingCount: 2, tags: ["Drama", "Comedy"], imageUrl: null },
  { id: "3", title: "Tomorrow, and Tomorrow, and Tomorrow", year: 2022, type: "BOOK", averageRating: 8.5, ratingCount: 2, tags: ["Contemporary", "Drama"], imageUrl: null },
  { id: "4", title: "Past Lives", year: 2023, type: "FILM", averageRating: 9.1, ratingCount: 2, tags: ["Romance", "Drama"], imageUrl: null },
  { id: "5", title: "The Midnight Library", year: 2020, type: "BOOK", averageRating: 7.4, ratingCount: 2, tags: ["Fantasy", "Thought-Provoking"], imageUrl: null },
];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";

  const params = searchParams ? await searchParams : {};
  const initialTab = params?.tab === "people" ? "people" : "culture";

  if (offline) {
    return (
      <DiscoverPageClient
        items={offlineDiscoverItems}
        people={[]}
        initialTab={initialTab}
        initialStatus={{}}
      />
    );
  }

  const session = await getServerSession(authOptions);

  const [itemsResult, peopleRows] = await Promise.all([
    prisma.item.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { reviews: true },
    }),
    prisma.user.findMany({
      where: { handle: { not: null } },
      select: { id: true, handle: true, bio: true, image: true },
      orderBy: { handle: "asc" },
    }),
  ]);

  const items = itemsResult;
  const people: DiscoverPerson[] = peopleRows
    .filter((u): u is typeof u & { handle: string } => u.handle != null)
    .map((u) => ({
      id: u.id,
      handle: `@${u.handle}`,
      bio: u.bio ?? null,
      image: u.image ?? null,
    }));

  const mapped: ItemCardItem[] = items.map((item) => {
    const ratingCount = item.reviews.length;
    const averageRating =
      ratingCount === 0
        ? 0
        : Number(
            (
              item.reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
            ).toFixed(1)
          );

    return {
      id: item.id,
      title: item.title,
      year: item.year ?? 0,
      type: item.type as ItemType,
      averageRating,
      ratingCount,
      tags: [],
      imageUrl: item.imageUrl ?? null,
    };
  });

  let initialStatus: Record<string, ItemStatus> = {};

  if (session?.user?.id && items.length > 0) {
    const ids = items.map((i) => i.id);
    const userId = session.user.id;

    const [savedRows, reviewRows] = await Promise.all([
      prisma.savedItem.findMany({
        where: { userId, itemId: { in: ids } },
        select: { itemId: true },
      }),
      prisma.review.findMany({
        where: { userId, itemId: { in: ids } },
        select: { itemId: true, id: true },
      }),
    ]);

    const savedSet = new Set(savedRows.map((r) => r.itemId));
    const reviewByItem = new Map(reviewRows.map((r) => [r.itemId, r.id]));

    initialStatus = ids.reduce<Record<string, ItemStatus>>((acc, id) => {
      const reviewId = reviewByItem.get(id);
      acc[id] = {
        saved: savedSet.has(id),
        reviewed: !!reviewId,
        ...(reviewId && { reviewId }),
      };
      return acc;
    }, {});
  }

  return (
    <DiscoverPageClient
      items={mapped}
      people={people}
      initialTab={initialTab}
      initialStatus={initialStatus}
    />
  );
}

