import { cache } from "react";

import { prisma } from "@/lib/prisma";

import { computeTasteMatch } from "./computeTasteMatch";
import { normalizeMatchHandle } from "./normalize";
import { tasteMatchUserFromPrismaRow } from "./prismaUserToSnapshot";
import type { TasteMatchResult } from "./types";

const userSelect = {
  id: true,
  name: true,
  handle: true,
  image: true,
  reviews: {
    select: {
      rating: true,
      item: {
        select: { id: true, title: true, type: true, tags: true },
      },
    },
  },
} as const;

export type PublicMatchUserRow = {
  id: string;
  name: string | null;
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
};

export type LoadedPublicMatch = {
  rowA: PublicMatchUserRow;
  rowB: PublicMatchUserRow;
  handleA: string;
  handleB: string;
  tasteMatch: TasteMatchResult;
};

/**
 * Load two users by URL slugs and compute taste match. Returns null if slugs invalid or users missing.
 * Wrapped in `cache` so `generateMetadata` and the page share one Prisma round-trip per request.
 */
export const loadPublicMatch = cache(
  async (rawA: string, rawB: string): Promise<LoadedPublicMatch | null> => {
    const a = normalizeMatchHandle(rawA);
    const b = normalizeMatchHandle(rawB);
    if (!a || !b || a === b) {
      return null;
    }

    const [rowA, rowB] = await Promise.all([
      prisma.user.findUnique({
        where: { handle: a },
        select: userSelect,
      }),
      prisma.user.findUnique({
        where: { handle: b },
        select: userSelect,
      }),
    ]);

    if (!rowA || !rowB) {
      return null;
    }

    const handleA = rowA.handle ?? a;
    const handleB = rowB.handle ?? b;

    const tasteMatch = computeTasteMatch(
      tasteMatchUserFromPrismaRow(rowA, a),
      tasteMatchUserFromPrismaRow(rowB, b),
    );

    return {
      rowA,
      rowB,
      handleA,
      handleB,
      tasteMatch,
    };
  },
);

/** Display name for OG / share (given name if set, else @handle). */
export function ogPersonLabel(
  row: { name: string | null; handle: string | null },
  handleFallback: string,
): string {
  const n = row.name?.trim();
  if (n) return n;
  return `@${row.handle ?? handleFallback}`;
}
