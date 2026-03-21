import type { TasteMatchUserSnapshot } from "./types";

/** Maps a Prisma user row (with reviews) into a snapshot for `computeTasteMatch`. */
export function tasteMatchUserFromPrismaRow(
  row: {
    id: string;
    handle: string | null;
    image: string | null;
    reviews: {
      rating: number;
      item: {
        id: string;
        title: string;
        type: string;
        tags: string[];
      };
    }[];
  },
  handleFallback: string,
): TasteMatchUserSnapshot {
  return {
    id: row.id,
    handle: row.handle ?? handleFallback,
    image: row.image,
    reviews: row.reviews.map((r) => ({
      rating: r.rating,
      item: {
        id: r.item.id,
        title: r.item.title,
        type: r.item.type,
        tags: r.item.tags ?? [],
      },
    })),
  };
}
