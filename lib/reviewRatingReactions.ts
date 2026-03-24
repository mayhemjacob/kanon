import type { ReviewRatingReactionType } from "@prisma/client";

export type RatingReactionSummary = {
  tooLowCount: number;
  aboutRightCount: number;
  tooHighCount: number;
  currentUserReaction: ReviewRatingReactionType | null;
};

export type RatingReactionUser = {
  id: string;
  handle: string | null;
  name: string | null;
  image: string | null;
};

export type RatingReactionDetailResponse = {
  totalCount: number;
  tooLowUsers: RatingReactionUser[];
  aboutRightUsers: RatingReactionUser[];
  tooHighUsers: RatingReactionUser[];
};

export function isRatingReactionType(
  v: unknown
): v is ReviewRatingReactionType {
  return v === "TOO_LOW" || v === "ABOUT_RIGHT" || v === "TOO_HIGH";
}

/** Local prediction for set / change / toggle-off (same type). */
export function optimisticReactionSummary(
  prev: RatingReactionSummary,
  selected: ReviewRatingReactionType
): RatingReactionSummary {
  let { tooLowCount, aboutRightCount, tooHighCount, currentUserReaction } =
    prev;

  function dec(t: ReviewRatingReactionType) {
    if (t === "TOO_LOW") tooLowCount = Math.max(0, tooLowCount - 1);
    else if (t === "ABOUT_RIGHT")
      aboutRightCount = Math.max(0, aboutRightCount - 1);
    else tooHighCount = Math.max(0, tooHighCount - 1);
  }

  function inc(t: ReviewRatingReactionType) {
    if (t === "TOO_LOW") tooLowCount += 1;
    else if (t === "ABOUT_RIGHT") aboutRightCount += 1;
    else tooHighCount += 1;
  }

  if (currentUserReaction === selected) {
    dec(selected);
    return {
      tooLowCount,
      aboutRightCount,
      tooHighCount,
      currentUserReaction: null,
    };
  }

  if (currentUserReaction) {
    dec(currentUserReaction);
  }
  inc(selected);

  return {
    tooLowCount,
    aboutRightCount,
    tooHighCount,
    currentUserReaction: selected,
  };
}
