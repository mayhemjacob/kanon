/**
 * Expands the tappable area to at least ~44×44px (mobile HIG) while keeping the
 * inner icon/circle visually the same. Use `group` on the outer element and
 * `group-hover:` on the inner span for hover styles.
 */
export const touchIconButtonOuterClass =
  "group inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center p-2 -m-2 touch-manipulation";

/** Filled circle (item/review/edit headers). */
export const touchIconButtonInnerSolidClass =
  "flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200";

/** Ghost circle (reviews list, followers back). */
export const touchIconButtonInnerGhostLgClass =
  "flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 group-hover:bg-zinc-100 group-hover:text-zinc-900";

/** Ghost circle, smaller glyph area (matches h-9 w-9 solid targets). */
export const touchIconButtonInnerGhostClass =
  "flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 group-hover:bg-zinc-100 group-hover:text-zinc-900";

/** List edit header / compact chevron. */
export const touchIconButtonInnerSquareSmClass =
  "flex h-8 w-8 items-center justify-center rounded-lg text-zinc-700 group-hover:bg-zinc-100";
