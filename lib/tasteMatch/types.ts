/** Public Taste Match payload (UI-ready). */

export type TasteMatchOverlapLevel = "low" | "medium" | "high";

export type TasteMatchBiggestDifference = {
  itemId: string;
  title: string;
  itemType: string;
  ratingA: number;
  ratingB: number;
  diff: number;
};

export type TasteMatchResult = {
  userA: { username: string; avatarUrl: string | null };
  userB: { username: string; avatarUrl: string | null };
  compatibilityScore: number;
  sharedCount: number;
  overlapLevel: TasteMatchOverlapLevel;
  insightLines: string[];
  biggestDifference: TasteMatchBiggestDifference | null;
  nudge: string | null;
};

export type TasteMatchItemSnapshot = {
  id: string;
  title: string;
  type: string;
  tags: string[];
};

export type TasteMatchRatingRow = {
  rating: number;
  item: TasteMatchItemSnapshot;
};

export type TasteMatchUserSnapshot = {
  id: string;
  handle: string;
  image: string | null;
  reviews: TasteMatchRatingRow[];
};
