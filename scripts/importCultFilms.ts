/**
 * Import curated cult film seeds via TMDb search → details → normalize → upsert.
 *
 * Requires TMDB_API_KEY; DATABASE_URL only when not dry-run.
 *
 * Examples:
 *   npx tsx scripts/importCultFilms.ts --bucket=international --limit=20 --dry-run=true
 *   npx tsx scripts/importCultFilms.ts --bucket=spanish --limit=20
 */

import {
  INTERNATIONAL_CULT_FILMS,
  SPANISH_CULT_FILMS,
  type CultFilmSeed,
} from "@/data/cultFilmSeeds";
import { normalizeTmdbMovie } from "@/lib/content/normalizeTmdbMovie";
import {
  fetchTmdbMovieDetails,
  searchTmdbMovies,
  type TmdbMovieSearchResult,
} from "@/lib/content/tmdb";
import { upsertImportedItem } from "@/lib/content/upsertImportedItem";
import { prisma } from "@/lib/prisma";

type BucketCli = "international" | "spanish";

function parseArgs(argv: string[]): {
  bucket: BucketCli | null;
  limit: number | null;
  dryRun: boolean;
} {
  let bucket: BucketCli | null = null;
  let limit: number | null = null;
  let dryRun = false;

  for (const arg of argv) {
    if (arg.startsWith("--bucket=")) {
      const v = arg.slice("--bucket=".length).trim().toLowerCase();
      if (v === "international" || v === "spanish") bucket = v;
    }
    if (arg.startsWith("--limit=")) {
      const n = parseInt(arg.slice("--limit=".length).trim(), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
    if (arg.startsWith("--dry-run=")) {
      const v = arg.slice("--dry-run=".length).trim().toLowerCase();
      dryRun = v === "true" || v === "1" || v === "yes";
    }
  }

  return { bucket, limit, dryRun };
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Align TMDb-style "Foo & Bar" with seed "Foo and Bar" before stripping punctuation.
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function yearFromReleaseDate(rd: string | undefined): number | null {
  if (typeof rd !== "string" || rd.length < 4) return null;
  const y = parseInt(rd.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

/** Same year + titles close: normalized equal, or one contains the other (min 5 chars). */
function closeTitle(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return true;
  if (na.length < 5 || nb.length < 5) return false;
  return na.includes(nb) || nb.includes(na);
}

function isStrongMatch(seed: CultFilmSeed, top: TmdbMovieSearchResult): boolean {
  const ry = yearFromReleaseDate(top.release_date);
  const nt = normalizeTitle(seed.title);
  const nTitle = normalizeTitle(top.title ?? "");
  const nOrig = normalizeTitle(top.original_title ?? "");
  const titleExact = nt === nTitle || nt === nOrig;

  if (titleExact) {
    if (seed.year !== undefined) return ry === seed.year;
    return true;
  }

  if (seed.year !== undefined && ry === seed.year) {
    return (
      closeTitle(seed.title, top.title ?? "") ||
      closeTitle(seed.title, top.original_title ?? "")
    );
  }

  return false;
}

async function main() {
  const { bucket, limit, dryRun } = parseArgs(process.argv.slice(2));

  if (!bucket) {
    console.error(
      "Missing --bucket. Use --bucket=international or --bucket=spanish",
    );
    process.exit(1);
  }

  let seeds: CultFilmSeed[] =
    bucket === "international" ? INTERNATIONAL_CULT_FILMS : SPANISH_CULT_FILMS;
  if (limit != null) seeds = seeds.slice(0, limit);

  console.log(
    `[importCultFilms] bucket=${bucket} seeds=${seeds.length} dryRun=${dryRun}`,
  );
  console.log("");

  let processed = 0;
  let matched = 0;
  let imported = 0;
  let skipped = 0;
  let ambiguous = 0;
  let failed = 0;

  for (const seed of seeds) {
    processed += 1;
    try {
      const searchPayload = await searchTmdbMovies(
        seed.title,
        seed.year,
      );
      const results = Array.isArray(searchPayload?.results)
        ? searchPayload.results
        : [];

      if (results.length === 0) {
        skipped += 1;
        console.log(
          `[importCultFilms] SKIP (no results) — "${seed.title}"${seed.year != null ? ` (${seed.year})` : ""}`,
        );
        continue;
      }

      const top = results[0] as TmdbMovieSearchResult;
      const topTitle = top.title ?? "?";
      const topYear = yearFromReleaseDate(top.release_date);

      if (!isStrongMatch(seed, top)) {
        ambiguous += 1;
        console.log(
          `[importCultFilms] AMBIGUOUS — seed "${seed.title}"${seed.year != null ? ` (${seed.year})` : ""} vs first hit "${topTitle}"${topYear != null ? ` (${topYear})` : ""} id=${top.id ?? "?"}`,
        );
        continue;
      }

      matched += 1;
      const id = top.id;
      if (id == null || !Number.isFinite(id)) {
        failed += 1;
        console.error(
          `[importCultFilms] FAIL — strong match but missing id for "${seed.title}"`,
        );
        continue;
      }

      const details = await fetchTmdbMovieDetails(id);
      const norm = normalizeTmdbMovie(details);

      if (dryRun) {
        console.log(
          `[importCultFilms] DRY-RUN would import — "${norm.title}" (${norm.year ?? "?"}) TMDB ${norm.externalId}`,
        );
        continue;
      }

      await upsertImportedItem(norm);
      imported += 1;
      console.log(
        `[importCultFilms] IMPORTED — "${norm.title}" (${norm.year ?? "?"}) TMDB ${norm.externalId}`,
      );
    } catch (err) {
      failed += 1;
      console.error(
        `[importCultFilms] FAIL — "${seed.title}":`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log("");
  console.log("[importCultFilms] Summary");
  console.log(`  processed: ${processed}`);
  console.log(`  matched:   ${matched}`);
  console.log(`  imported:  ${imported}`);
  console.log(`  skipped:   ${skipped}`);
  console.log(`  ambiguous: ${ambiguous}`);
  console.log(`  failed:    ${failed}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
