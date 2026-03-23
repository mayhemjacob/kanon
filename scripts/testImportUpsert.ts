/**
 * Local-only: fetch + normalize + upsert one movie, one TV show, and (if available) one book.
 * Requires DATABASE_URL, TMDB_API_KEY, and GOOGLE_BOOKS_API_KEY (e.g. from .env.local).
 *
 * Run from repo root: npx tsx scripts/testImportUpsert.ts
 */

import { searchGoogleBooks } from "@/lib/content/googleBooks";
import type { KanonImportedItem } from "@/lib/content/kanonImportModel";
import { normalizeGoogleBook } from "@/lib/content/normalizeGoogleBook";
import { normalizeTmdbMovie } from "@/lib/content/normalizeTmdbMovie";
import { normalizeTmdbTv } from "@/lib/content/normalizeTmdbTv";
import { fetchTmdbMovieDetails, fetchTmdbTvDetails } from "@/lib/content/tmdb";
import { upsertImportedItem } from "@/lib/content/upsertImportedItem";
import { prisma } from "@/lib/prisma";
import type { Item } from "@prisma/client";

const TMDB_MOVIE_ID = 550;
const TMDB_TV_ID = 1396;
const GOOGLE_SEARCH_QUERY = "don quixote";
const GOOGLE_MAX_RESULTS = 1;

function logCompactNormalized(label: string, norm: KanonImportedItem) {
  const { rawPayload: _omit, ...preview } = norm;
  console.log(`${label} — normalized (no rawPayload)`);
  console.log(JSON.stringify(preview, null, 2));
  console.log("");
}

function logUpserted(label: string, row: Item) {
  console.log(`${label} — upserted`);
  console.log(
    JSON.stringify(
      {
        id: row.id,
        type: row.type,
        title: row.title,
        externalSource: row.externalSource,
        externalId: row.externalId,
      },
      null,
      2,
    ),
  );
  console.log("");
}

async function main() {
  const moviePayload = await fetchTmdbMovieDetails(TMDB_MOVIE_ID);
  const movieNorm = normalizeTmdbMovie(moviePayload);
  logCompactNormalized("TMDb movie", movieNorm);
  const movieRow = await upsertImportedItem(movieNorm);
  logUpserted("TMDb movie", movieRow);

  const tvPayload = await fetchTmdbTvDetails(TMDB_TV_ID);
  const tvNorm = normalizeTmdbTv(tvPayload);
  logCompactNormalized("TMDb TV", tvNorm);
  const tvRow = await upsertImportedItem(tvNorm);
  logUpserted("TMDb TV", tvRow);

  try {
    const searchPayload = await searchGoogleBooks(
      GOOGLE_SEARCH_QUERY,
      GOOGLE_MAX_RESULTS,
    );
    const items = (searchPayload as { items?: unknown }).items;
    if (!Array.isArray(items) || items.length === 0) {
      console.log("Google Books search — no items[]; skipping book upsert.");
      console.log("");
    } else {
      const bookNorm = normalizeGoogleBook(items[0]);
      logCompactNormalized("Google Books (first search hit)", bookNorm);
      const bookRow = await upsertImportedItem(bookNorm);
      logUpserted("Google Books", bookRow);
    }
  } catch (err) {
    console.log("Google Books search — error (skipping book upsert)");
    console.error(err instanceof Error ? err.message : err);
    console.log("");
  }

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
