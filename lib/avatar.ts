/**
 * Avatars are historically stored in `User.image` as base64 `data:` URIs (some are MBs).
 * Embedding them in page/API payloads made Home, Discover and Notifications 6–13 MB.
 * Instead, payloads carry a short URL served by `app/api/avatar/[userId]/route.ts`,
 * which the browser fetches separately and caches.
 *
 * `version` only busts the browser cache when the photo changes; any value that changes
 * with the stored image works (e.g. `pg_column_size(u.image)` in SQL, `image.length` in JS).
 */
export function inlineAvatarUrl(userId: string, version: number | string): string {
  return `/api/avatar/${encodeURIComponent(userId)}?v=${version}`
}

export function isInlineImage(value: string | null | undefined): boolean {
  return typeof value === "string" && (value.startsWith("data:") || value.startsWith("blob:"))
}
