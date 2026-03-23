/** Max length for inline data:/blob: URLs only (base64 can be huge; cap for safety). */
const MAX_INLINE_IMAGE_URL_LEN = 4096;

/**
 * Legacy identifier — some dev caches / partial merges still reference this name.
 * Use a huge value so normal `https://` poster URLs are never dropped (Discover regression
 * when this was 4096 for all URLs). Inline caps still use {@link MAX_INLINE_IMAGE_URL_LEN}.
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
    return t.length > MAX_INLINE_IMAGE_URL_LEN ? null : t;
  }

  // Protocol-relative poster URLs (next/image needs an absolute https URL)
  if (t.startsWith("//")) {
    try {
      const u = new URL(`https:${t}`);
      const host = u.hostname;
      const knownHost =
        host === "image.tmdb.org" ||
        host === "books.google.com" ||
        host === "lh3.googleusercontent.com" ||
        host.endsWith(".googleusercontent.com") ||
        host === "avatars.githubusercontent.com" ||
        host === "www.gravatar.com" ||
        host === "secure.gravatar.com" ||
        host === "platform-lookaside.fbsbx.com" ||
        host.endsWith(".supabase.co");
      if (knownHost) {
        t = u.href;
      }
    } catch {
      /* keep t */
    }
  }

  if (t.startsWith("http://")) {
    try {
      const u = new URL(t);
      const host = u.hostname;
      const upgradeToHttps =
        host === "image.tmdb.org" ||
        host === "books.google.com" ||
        host === "lh3.googleusercontent.com" ||
        host.endsWith(".googleusercontent.com") ||
        host === "avatars.githubusercontent.com" ||
        host === "www.gravatar.com" ||
        host === "secure.gravatar.com" ||
        host === "platform-lookaside.fbsbx.com" ||
        host.endsWith(".supabase.co");
      if (upgradeToHttps) {
        u.protocol = "https:";
        t = u.href;
      }
    } catch {
      /* keep original string */
    }
  }

  return t;
}
