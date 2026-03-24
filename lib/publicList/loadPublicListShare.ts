import { cache } from "react";

import { prisma } from "@/lib/prisma";

export type PublicListSharePayload = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  owner: {
    handle: string | null;
    name: string | null;
    image: string | null;
  };
  items: Array<{
    id: string;
    position: number;
    item: {
      id: string;
      title: string;
      year: number | null;
      director: string | null;
      imageUrl: string | null;
    };
  }>;
};

/**
 * Load data for public `/l/[listId]` page + metadata + OG image.
 * Cached per request so page and metadata can share one query.
 */
export const loadPublicListShare = cache(
  async (listId: string): Promise<PublicListSharePayload | null> => {
    const id = listId?.trim();
    if (!id) return null;

    const list = await prisma.list.findFirst({
      where: {
        id,
        visibility: "PUBLIC",
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        owner: {
          select: {
            handle: true,
            name: true,
            image: true,
          },
        },
        items: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            position: true,
            item: {
              select: {
                id: true,
                title: true,
                year: true,
                director: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!list) return null;
    return list;
  },
);

export function listCuratorLabel(handle: string | null, name: string | null): string {
  if (handle?.trim()) return `@${handle.trim()}`;
  if (name?.trim()) return name.trim();
  return "Member";
}
