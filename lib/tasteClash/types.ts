/** Public Taste Clash payload (UI-ready). */

export type TasteClashOverlapLevel = "low" | "medium" | "high";

export type TasteClashBiggestClash = {
  itemId: string;
  title: string;
  itemType: string | null;
  ratingA: number;
  ratingB: number;
  diff: number;
};

export type TasteClashResult = {
  userA: {
    username: string;
    avatarUrl?: string | null;
  };
  userB: {
    username: string;
    avatarUrl?: string | null;
  };
  compatibilityScore: number;
  sharedCount: number;
  overlapLevel: TasteClashOverlapLevel;
  /** Max 4 short lines for the card body */
  insightLines: string[];
  biggestClash: TasteClashBiggestClash | null;
  /** Shown outside the main list when overlap is thin */
  nudge: string | null;
};

/** One rating with item metadata — plain data for pure computation. */
export type TasteClashItemSnapshot = {
  id: string;
  title: string;
  type: string;
  tags: string[];
};

export type TasteClashRatingRow = {
  rating: number;
  item: TasteClashItemSnapshot;
};

export type TasteClashUserSnapshot = {
  id: string;
  handle: string;
  image: string | null;
  reviews: TasteClashRatingRow[];
};
