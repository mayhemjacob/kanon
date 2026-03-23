/**
 * Bulk import popular TMDb movies or TV into Kanon (sequential, one item at a time).
 *
 * Requires DATABASE_URL and TMDB_API_KEY (e.g. export or load via your shell from .env.local).
 *
 * Run from repo root:
 *   npx tsx scripts/importTmdbPopular.ts --type=movie --pages=1
 *   npx tsx scripts/importTmdbPopular.ts --type=tv --pages=1
 */

import { normalizeTmdbMovie } from "@/lib/content/normalizeTmdbMovie";
import { normalizeTmdbTv } from "@/lib/content/normalizeTmdbTv";
import {
  fetchTmdbMovieDetails,
  fetchTmdbPopularMovies,
  fetchTmdbPopularTv,
  fetchTmdbTvDetails,
} from "@/lib/content/tmdb";
import { upsertImportedItem } from "@/lib/content/upsertImportedItem";
import { prisma } from "@/lib/prisma";

type ImportType = "movie" | "tv";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Jitter ~150–250ms between successive TMDb detail fetches (first request has no prior delay). */
async function delayBetweenDetailRequests(): Promise<void> {
  const ms = 150 + Math.floor(Math.random() * 101);
  await delay(ms);
}

/** `tmdbFetch` errors look like `TMDb request failed (429 ...)`. */
function isLikelyTmdb429(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\(\s*429\b/.test(msg);
}

/** On 429, wait then retry the same operation once; other errors propagate immediately. */
async function withTmdb429RetryOnce<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isLikelyTmdb429(err)) throw err;
    console.log(`[importTmdbPopular] ${label} — rate limited (429), waiting 3s, retry once`);
    await delay(3000);
    return await fn();
  }
}

function parseArgs(argv: string[]): { type: ImportType | null; pages: number } {
  let type: ImportType | null = null;
  let pages = 1;

  for (const arg of argv) {
    if (arg.startsWith("--type=")) {
      const v = arg.slice("--type=".length).trim().toLowerCase();
      if (v === "movie" || v === "tv") type = v;
    }
    if (arg.startsWith("--pages=")) {
      const raw = arg.slice("--pages=".length).trim();
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 1) pages = n;
    }
  }

  return { type, pages };
}

function extractIdsFromPopularList(data: { results?: Array<{ id?: number }> }): number[] {
  const results = data.results;
  if (!Array.isArray(results)) return [];
  const ids: number[] = [];
  for (const row of results) {
    const id = row?.id;
    if (typeof id === "number" && Number.isFinite(id)) ids.push(id);
  }
  return ids;
}

async function main() {
  const { type, pages } = parseArgs(process.argv.slice(2));

  if (!type) {
    console.error(
      "Missing or invalid --type. Use --type=movie or --type=tv (e.g. --type=movie --pages=1).",
    );
    process.exit(1);
  }

  const label = type === "movie" ? "movies" : "TV shows";
  console.log(`[importTmdbPopular] Starting bulk import: ${label}, pages=1..${pages} (sequential)`);
  console.log("");

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let detailRequestIndex = 0;

  for (let page = 1; page <= pages; page++) {
    let list: { results?: Array<{ id?: number }> };
    try {
      list = await withTmdb429RetryOnce(`Popular list page ${page}`, () =>
        type === "movie"
          ? fetchTmdbPopularMovies(page)
          : fetchTmdbPopularTv(page),
      );
    } catch (err) {
      console.error(
        `[importTmdbPopular] Failed to fetch popular list page ${page} (skipping page):`,
        err instanceof Error ? err.message : err,
      );
      continue;
    }

    const ids = extractIdsFromPopularList(list);
    if (ids.length === 0) {
      console.log(`[importTmdbPopular] Page ${page}: no result ids; skipping.`);
      continue;
    }

    for (const id of ids) {
      processed += 1;
      try {
        if (detailRequestIndex > 0) await delayBetweenDetailRequests();
        detailRequestIndex += 1;

        const details = await withTmdb429RetryOnce(`${type} id=${id}`, () =>
          type === "movie"
            ? fetchTmdbMovieDetails(id)
            : fetchTmdbTvDetails(id),
        );
        const normalized =
          type === "movie"
            ? normalizeTmdbMovie(details)
            : normalizeTmdbTv(details);
        await upsertImportedItem(normalized);

        const kind = type === "movie" ? "FILM" : "SHOW";
        console.log(
          `[importTmdbPopular] OK — title="${normalized.title}" type=${kind} externalId=${normalized.externalId}`,
        );
        succeeded += 1;
      } catch (err) {
        failed += 1;
        console.error(
          `[importTmdbPopular] FAIL — ${type} id=${id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  console.log("");
  console.log("[importTmdbPopular] Done.");
  console.log(`  processed: ${processed}`);
  console.log(`  succeeded: ${succeeded}`);
  console.log(`  failed:    ${failed}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
