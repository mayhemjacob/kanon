import { cache } from "react";

import { prisma } from "@/lib/prisma";

export type PublicReviewSharePayload = {
  rating: number;
  body: string | null;
  createdAt: Date;
  user: {
    handle: string | null;
    name: string | null;
    image: string | null;
  };
  item: {
    title: string;
    year: number | null;
    type: string;
    imageUrl: string | null;
  };
};

/**
 * Load review + item + reviewer for public `/r/[publicShareId]` page and OG generation.
 * Cached per request so `generateMetadata` + page share one query.
 */
export const loadPublicReviewShare = cache(
  async (publicShareId: string): Promise<PublicReviewSharePayload | null> => {
    const token = publicShareId?.trim();
    if (!token || token.length < 8) return null;

    const review = await prisma.review.findUnique({
      where: { publicShareId: token },
      select: {
        rating: true,
        body: true,
        createdAt: true,
        user: {
          select: {
            handle: true,
            name: true,
            image: true,
          },
        },
        item: {
          select: {
            title: true,
            year: true,
            type: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!review) return null;

    return {
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
      user: review.user,
      item: review.item,
    };
  },
);

export function reviewerDisplayLabel(
  handle: string | null,
  name: string | null,
): string {
  if (handle?.trim()) return `@${handle.trim()}`;
  if (name?.trim()) return name.trim();
  return "Member";
}

export function itemTypeLabel(type: string): string {
  if (type === "SHOW") return "SERIES";
  return type;
}
