import type {
  TasteMatchBiggestDifference,
  TasteMatchOverlapLevel,
  TasteMatchResult,
  TasteMatchUserSnapshot,
} from "./types";

const RATING_SCALE = 10;
/** Min gap between users’ global averages to show “rates higher overall” */
const POSTURE_MEANINGFUL_DIFF = 0.85;
/** Both must rate at least this for “shared love” title pick */
const BOTH_LOVED_MIN = 8;
/** For tag overlap, both must clear this bar */
const TAG_BOTH_MIN = 7;
/** Tag must appear on at least this many distinct shared items (both above TAG_BOTH_MIN) */
const TAG_MIN_ITEMS = 2;

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function overlapLevelFromCount(n: number): TasteMatchOverlapLevel {
  if (n <= 2) return "low";
  if (n <= 6) return "medium";
  return "high";
}

type SharedRow = {
  item: TasteMatchUserSnapshot["reviews"][0]["item"];
  ra: number;
  rb: number;
};

function buildSharedRows(a: TasteMatchUserSnapshot, b: TasteMatchUserSnapshot): SharedRow[] {
  const byItem = new Map<string, { rating: number; item: SharedRow["item"] }>();
  for (const r of a.reviews) {
    byItem.set(r.item.id, { rating: r.rating, item: r.item });
  }
  const out: SharedRow[] = [];
  for (const r of b.reviews) {
    const left = byItem.get(r.item.id);
    if (left) {
      out.push({ item: left.item, ra: left.rating, rb: r.rating });
    }
  }
  return out;
}

function compatibilityFromShared(shared: SharedRow[]): number {
  if (shared.length === 0) return 50;
  const sims = shared.map(
    (s) => 1 - Math.abs(s.ra - s.rb) / RATING_SCALE,
  );
  const raw = mean(sims) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

function postureLine(a: TasteMatchUserSnapshot, b: TasteMatchUserSnapshot): string | null {
  const ra = a.reviews.map((r) => r.rating);
  const rb = b.reviews.map((r) => r.rating);
  if (ra.length === 0 || rb.length === 0) return null;
  const avgA = mean(ra);
  const avgB = mean(rb);
  const d = avgA - avgB;
  if (Math.abs(d) < POSTURE_MEANINGFUL_DIFF) return null;
  if (d > 0) return `@${a.handle} rates higher overall`;
  return `@${b.handle} rates higher overall`;
}

/**
 * Tag insight: among shared titles where both rated ≥ TAG_BOTH_MIN, find a tag
 * that appears on ≥ TAG_MIN_ITEMS distinct items. Uses Item.tags (curated chips).
 */
function tagPreferenceLine(shared: SharedRow[]): string | null {
  const high = shared.filter((s) => s.ra >= TAG_BOTH_MIN && s.rb >= TAG_BOTH_MIN);
  const tagToItemIds = new Map<string, Set<string>>();
  for (const s of high) {
    for (const tag of s.item.tags) {
      const t = tag.trim();
      if (!t) continue;
      if (!tagToItemIds.has(t)) tagToItemIds.set(t, new Set());
      tagToItemIds.get(t)!.add(s.item.id);
    }
  }
  let bestTag: string | null = null;
  let bestSize = 0;
  for (const [tag, ids] of tagToItemIds) {
    if (ids.size >= TAG_MIN_ITEMS && ids.size > bestSize) {
      bestSize = ids.size;
      bestTag = tag;
    }
  }
  if (!bestTag) return null;
  const label = bestTag.toLowerCase();
  return `You both love ${label}`;
}

function typeDominanceLine(shared: SharedRow[]): string | null {
  if (shared.length < 2) return null;
  const counts = { FILM: 0, SHOW: 0, BOOK: 0 };
  for (const s of shared) {
    const t = s.item.type;
    if (t === "FILM") counts.FILM++;
    else if (t === "SHOW") counts.SHOW++;
    else if (t === "BOOK") counts.BOOK++;
  }
  const total = shared.length;
  const entries = Object.entries(counts) as [keyof typeof counts, number][];
  entries.sort((x, y) => y[1] - x[1]);
  const [top, n] = entries[0];
  if (n / total < 0.55) return null;
  if (top === "FILM") return "You overlap most on films";
  if (top === "SHOW") return "You overlap most on series";
  return "You overlap most on books";
}

function bothLovedLine(shared: SharedRow[]): string | null {
  const pool = shared.filter((s) => s.ra >= BOTH_LOVED_MIN && s.rb >= BOTH_LOVED_MIN);
  if (pool.length === 0) return null;
  pool.sort((x, y) => {
    const minY = Math.min(y.ra, y.rb);
    const minX = Math.min(x.ra, x.rb);
    if (minY !== minX) return minY - minX;
    const gapY = Math.abs(y.ra - y.rb);
    const gapX = Math.abs(x.ra - x.rb);
    if (gapY !== gapX) return gapX - gapY;
    return x.item.title.localeCompare(y.item.title);
  });
  const pick = pool[pool.length - 1];
  return `You both loved ${pick.item.title}`;
}

function agreeSoftLine(shared: SharedRow[]): string | null {
  if (shared.length === 0) return null;
  const sims = shared.map((s) => 1 - Math.abs(s.ra - s.rb) / RATING_SCALE);
  if (mean(sims) >= 0.78) return "You tend to agree on shared ratings";
  return null;
}

function computeBiggestDifference(shared: SharedRow[]): TasteMatchBiggestDifference | null {
  if (shared.length === 0) return null;
  let best: SharedRow | null = null;
  let bestDiff = -1;
  for (const s of shared) {
    const diff = Math.abs(s.ra - s.rb);
    if (diff > bestDiff) {
      bestDiff = diff;
      best = s;
    } else if (diff === bestDiff && best) {
      if (s.ra + s.rb > best.ra + best.rb) best = s;
    }
  }
  if (!best || bestDiff === 0) return null;
  return {
    itemId: best.item.id,
    title: best.item.title,
    itemType: best.item.type,
    ratingA: best.ra,
    ratingB: best.rb,
    diff: bestDiff,
  };
}

function startingOutLine(sharedCount: number): string | null {
  if (sharedCount === 0) return "You've only just started shaping this taste match";
  return null;
}

/**
 * Build up to 4 insight lines. Order: posture → tag/type → loved/agree → largest difference (if shared).
 * Then data-backed fallbacks only until 4 lines.
 */
function buildInsightLines(input: {
  posture: string | null;
  tagLine: string | null;
  typeLine: string | null;
  lovedLine: string | null;
  agreeLine: string | null;
  biggestDifference: TasteMatchBiggestDifference | null;
  sharedCount: number;
}): string[] {
  const ordered: string[] = [];
  if (input.posture) ordered.push(input.posture);
  if (input.tagLine) ordered.push(input.tagLine);
  else if (input.typeLine) ordered.push(input.typeLine);
  if (input.lovedLine) ordered.push(input.lovedLine);
  else if (input.agreeLine) ordered.push(input.agreeLine);
  if (input.sharedCount > 0) {
    if (input.biggestDifference) {
      ordered.push(`You disagree most on ${input.biggestDifference.title}`);
    } else {
      ordered.push("No sharp disagreements on shared titles yet");
    }
  }

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const s of ordered) {
    if (lines.length >= 4) break;
    if (!seen.has(s)) {
      seen.add(s);
      lines.push(s);
    }
  }

  const fallbacks: string[] = [];
  if (input.sharedCount === 0) {
    fallbacks.push(startingOutLine(input.sharedCount)!);
  }
  if (input.agreeLine && !seen.has(input.agreeLine)) fallbacks.push(input.agreeLine);
  if (input.typeLine && !seen.has(input.typeLine)) fallbacks.push(input.typeLine);
  fallbacks.push("Your taste overlap is still taking shape");

  for (const f of fallbacks) {
    if (lines.length >= 4) break;
    if (f && !seen.has(f)) {
      seen.add(f);
      lines.push(f);
    }
  }

  return lines.slice(0, 4);
}

/**
 * Pure Taste Match computation (no I/O). Callers load Prisma rows into snapshots first.
 */
export function computeTasteMatch(
  userA: TasteMatchUserSnapshot,
  userB: TasteMatchUserSnapshot,
): TasteMatchResult {
  const shared = buildSharedRows(userA, userB);
  const sharedCount = shared.length;
  const compatibilityScore = compatibilityFromShared(shared);
  const overlapLevel = overlapLevelFromCount(sharedCount);

  const posture = postureLine(userA, userB);
  const tagLine = tagPreferenceLine(shared);
  const typeLine = typeDominanceLine(shared);
  const lovedLine = bothLovedLine(shared);
  const agreeLine = agreeSoftLine(shared);
  const biggestDifference = computeBiggestDifference(shared);

  let insightLines = buildInsightLines({
    posture,
    tagLine,
    typeLine,
    lovedLine,
    agreeLine,
    biggestDifference,
    sharedCount,
  });

  if (insightLines.length === 0) {
    const start = startingOutLine(sharedCount);
    insightLines = start
      ? [start]
      : ["This taste match will grow as you both rate more"];
  }

  insightLines = insightLines.slice(0, 4);

  const nudge =
    sharedCount <= 2
      ? "Add more films, series, and books to sharpen your taste match."
      : null;

  return {
    userA: {
      username: `@${userA.handle}`,
      avatarUrl: userA.image,
    },
    userB: {
      username: `@${userB.handle}`,
      avatarUrl: userB.image,
    },
    compatibilityScore,
    sharedCount,
    overlapLevel,
    insightLines,
    biggestDifference,
    nudge,
  };
}
