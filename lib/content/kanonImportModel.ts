/**
 * Normalized shape for catalog data coming from external providers (TMDb, Google Books, etc.).
 * Maps 1:1 with Kanon `Item` + import provenance fields; no Prisma dependency.
 */

export type KanonImportSource = "TMDB_MOVIE" | "TMDB_TV" | "GOOGLE_BOOKS";

export type KanonImportItemType = "FILM" | "SHOW" | "BOOK";

export type KanonImportedItem = {
  type: KanonImportItemType;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  director?: string | null;
  tags: string[];
  externalSource: KanonImportSource;
  externalId: string;
  sourceUpdatedAt?: Date | null;
  rawPayload?: unknown;
};
