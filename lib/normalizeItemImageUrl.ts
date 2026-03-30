/**
 * Legacy identifier — some dev caches / partial merges still reference this name.
 * Use a huge value so normal `https://` poster URLs are never dropped (Discover regression
 * when this was 4096 for all URLs).
 */
export const MAX_ITEM_IMAGE_URL_LEN = Number.MAX_SAFE_INTEGER;

export type NormalizeItemImageUrlOptions = {
  /**
   * When true, drop data:/blob: URLs (e.g. home feed `unstable_cache` payload size).
   * Default false so item pages can still show inline uploads if ever stored.
   */
  omitDataAndBlob?: boolean;
};

/**
 * Prepares stored `Item.imageUrl` for `next/image`:
 * - Upgrades `http://` TMDb / Google Books to `https://` (remotePatterns are https-only).
 * - Caps length only for data:/blob: (long https poster URLs must not be dropped).
 * - Optionally drops data/blob URLs (feed cache).
 */
export function normalizeItemImageUrlForNext(
  url: string | null | undefined,
  options: NormalizeItemImageUrlOptions = {},
): string | null {
  if (url == null || typeof url !== "string") return null;
  let t = url.trim();
  if (!t) return null;

  const isInline = t.startsWith("data:") || t.startsWith("blob:");
  if (isInline) {
    if (options.omitDataAndBlob) return null;
    return t;
  }

  // Protocol-relative URLs (next/image needs an absolute https URL)
  if (t.startsWith("//")) {
    try {
      t = new URL(`https:${t}`).href;
    } catch {
      /* keep t */
    }
  }

  if (t.startsWith("http://")) {
    try {
      const u = new URL(t);
      u.protocol = "https:";
      t = u.href;
    } catch {
      /* keep original string */
    }
  }

  return t;
}
