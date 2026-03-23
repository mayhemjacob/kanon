/**
 * Local-only: fetch one example per provider and print normalized Kanon import rows.
 * Requires TMDB_API_KEY and GOOGLE_BOOKS_API_KEY in the environment (e.g. .env.local).
 *
 * Run from repo root (see README note in package.json or use npx tsx).
 */

import {
  fetchGoogleBookById,
  searchGoogleBooks,
} from "@/lib/content/googleBooks";
import type { KanonImportedItem } from "@/lib/content/kanonImportModel";
import { normalizeGoogleBook } from "@/lib/content/normalizeGoogleBook";
import { normalizeTmdbMovie } from "@/lib/content/normalizeTmdbMovie";
import { normalizeTmdbTv } from "@/lib/content/normalizeTmdbTv";
import { fetchTmdbMovieDetails, fetchTmdbTvDetails } from "@/lib/content/tmdb";

/** Fight Club — common TMDb example */
const EXAMPLE_TMDB_MOVIE_ID = 550;

/** Breaking Bad */
const EXAMPLE_TMDB_TV_ID = 1396;

const EXAMPLE_GOOGLE_BOOKS_VOLUME_ID = "zyTCAlFPUDYC";

function logCompactPreview(label: string, norm: KanonImportedItem) {
  const { rawPayload: _omit, ...preview } = norm;
  console.log(label);
  console.log(JSON.stringify(preview, null, 2));
  console.log("");
}

async function main() {
  const moviePayload = await fetchTmdbMovieDetails(EXAMPLE_TMDB_MOVIE_ID);
  const movieNorm = normalizeTmdbMovie(moviePayload);
  logCompactPreview("TMDb Movie", movieNorm);

  const tvPayload = await fetchTmdbTvDetails(EXAMPLE_TMDB_TV_ID);
  const tvNorm = normalizeTmdbTv(tvPayload);
  logCompactPreview("TMDb TV", tvNorm);

  try {
    const searchPayload = await searchGoogleBooks("don quixote", 1);
    const items = (searchPayload as { items?: unknown }).items;
    if (!Array.isArray(items) || items.length === 0) {
      console.log("Google Books search");
      console.log(
        "No items[] in response (preview):",
        JSON.stringify(searchPayload, null, 2).slice(0, 800),
      );
      console.log("");
    } else {
      const norm = normalizeGoogleBook(items[0]);
      logCompactPreview("Google Books search", norm);
    }
  } catch (err) {
    console.log("Google Books search");
    console.error("Error:", err instanceof Error ? err.message : err);
    console.log("");
  }

  try {
    const bookPayload = await fetchGoogleBookById(EXAMPLE_GOOGLE_BOOKS_VOLUME_ID);
    const bookNorm = normalizeGoogleBook(bookPayload);
    logCompactPreview("Google Books volume by ID", bookNorm);
  } catch (err) {
    console.log("Google Books volume by ID");
    console.error("Error:", err instanceof Error ? err.message : err);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
