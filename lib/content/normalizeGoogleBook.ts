import type { KanonImportedItem } from "@/lib/content/kanonImportModel";
import { mapGoogleBookCategoriesToKanonTags } from "@/lib/content/mapImportTags";

/** First 4-digit year in the string (handles partial dates and loose strings). */
function yearFromPublishedDate(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(/\d{4}/);
  if (!m) return null;
  const y = parseInt(m[0], 10);
  return Number.isFinite(y) ? y : null;
}

function preferHttpsImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.replace(/^http:\/\//i, "https://");
}

export function normalizeGoogleBook(payload: any): KanonImportedItem {
  const vi = payload?.volumeInfo;

  const title = typeof vi?.title === "string" ? vi.title : "";

  const year = yearFromPublishedDate(vi?.publishedDate);

  const links = vi?.imageLinks;
  const thumbRaw =
    (typeof links?.thumbnail === "string" && links.thumbnail) ||
    (typeof links?.smallThumbnail === "string" && links.smallThumbnail) ||
    null;
  const imageUrl = preferHttpsImageUrl(thumbRaw);

  const description =
    typeof vi?.description === "string" ? vi.description : null;

  let director: string | null = null;
  const authors = vi?.authors;
  if (Array.isArray(authors) && authors.length > 0) {
    const a = authors[0];
    if (typeof a === "string" && a.length > 0) director = a;
    else if (a != null) director = String(a);
  }

  const id = payload?.id;
  const externalId = id != null && String(id).length > 0 ? String(id) : "";

  return {
    type: "BOOK",
    title,
    originalTitle: null,
    year,
    imageUrl,
    description,
    director,
    tags: mapGoogleBookCategoriesToKanonTags(vi?.categories),
    externalSource: "GOOGLE_BOOKS",
    externalId,
    sourceUpdatedAt: null,
    rawPayload: payload,
  };
}
