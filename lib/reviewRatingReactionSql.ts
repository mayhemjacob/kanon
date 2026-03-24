import type { ReviewRatingReactionType } from "@prisma/client";
import { Prisma } from "@prisma/client";

/**
 * PostgreSQL enum literal for raw queries. Values are fixed — never interpolate user input.
 */
export function reactionTypeAsPgEnum(t: ReviewRatingReactionType): Prisma.Sql {
  switch (t) {
    case "TOO_LOW":
      return Prisma.raw(`'TOO_LOW'::"ReviewRatingReactionType"`);
    case "ABOUT_RIGHT":
      return Prisma.raw(`'ABOUT_RIGHT'::"ReviewRatingReactionType"`);
    case "TOO_HIGH":
      return Prisma.raw(`'TOO_HIGH'::"ReviewRatingReactionType"`);
    default:
      throw new Error("Invalid reaction type");
  }
}
