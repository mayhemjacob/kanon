import type { Item, ItemExternalSource, ItemType } from "@prisma/client";

import type { KanonImportedItem } from "@/lib/content/kanonImportModel";
import { prisma } from "@/lib/prisma";

/**
 * Maps a normalized import row into Prisma `Item` scalars (no relations).
 * Optional fields become `null` when absent so nullable DB columns are explicit.
 */
function toItemUpsertData(item: KanonImportedItem) {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const sourceUpdatedAt = item.sourceUpdatedAt ?? new Date();

  return {
    type: item.type as ItemType,
    title: item.title,
    originalTitle: item.originalTitle ?? null,
    year: item.year ?? null,
    imageUrl: item.imageUrl ?? null,
    director: item.director ?? null,
    description: item.description ?? null,
    tags,
    externalSource: item.externalSource as ItemExternalSource,
    externalId: item.externalId,
    sourceUpdatedAt,
  };
}

/**
 * Upsert a single catalog row by `(externalSource, externalId)`.
 * Does not touch `reviews`, `savedBy`, or other relations.
 */
export async function upsertImportedItem(
  item: KanonImportedItem,
): Promise<Item> {
  const data = toItemUpsertData(item);

  return prisma.item.upsert({
    where: {
      externalSource_externalId: {
        externalSource: data.externalSource,
        externalId: data.externalId,
      },
    },
    create: data,
    update: data,
  });
}
