import type { PrismaClient } from "@prisma/client";

let cachedExists: boolean | null = null;

/** Cleared in tests if needed */
export function resetReviewRatingReactionTableCache(): void {
  cachedExists = null;
}

/**
 * Whether the migrated `ReviewRatingReaction` table is present (public schema).
 */
export async function reviewRatingReactionTableExists(
  client: PrismaClient
): Promise<boolean> {
  if (cachedExists === true) return true;
  try {
    const rows = await client.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT to_regclass('public."ReviewRatingReaction"') IS NOT NULL AS "exists"`
    );
    const exists = rows[0]?.exists === true;
    if (exists) cachedExists = true;
    return exists;
  } catch {
    return false;
  }
}

export class ReviewRatingReactionsMigrationError extends Error {
  constructor() {
    super(
      "Reactions aren’t available until the database is updated. Run `npx prisma migrate dev` with your project’s DATABASE_URL, or run the SQL in `prisma/migrations/20260324190000_add_review_rating_reactions/migration.sql` (e.g. Supabase → SQL Editor)."
    );
    this.name = "ReviewRatingReactionsMigrationError";
  }
}
