import { TAGS } from "@/lib/tags";

const ALLOWED = new Set<string>([...TAGS]);

const MAX_IMPORT_TAGS = 3;

/** TMDb genre `name` (English) lowercased → exact Kanon `TAGS` label. */
const TMDB_GENRE_TO_KANON: Record<string, string> = {
  action: "Action",
  adventure: "Adventure",
  animation: "Animation",
  comedy: "Comedy",
  crime: "Crime",
  documentary: "Documentary",
  drama: "Drama",
  fantasy: "Fantasy",
  horror: "Horror",
  mystery: "Mystery",
  romance: "Romance",
  "science fiction": "Sci-Fi",
  thriller: "Thriller",
  war: "War",
  western: "Western",
  history: "Historical",
  suspense: "Suspense",
};

function finalizeOrderedUnique(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    if (!ALLOWED.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_IMPORT_TAGS) break;
  }
  return out;
}

/**
 * Maps TMDb movie/TV `genres` to Kanon `TAGS` labels only.
 * Preserves API order, dedupes, caps at 3.
 */
export function mapTmdbGenresToKanonTags(
  genres: Array<{ id?: number; name?: string }> | null | undefined,
): string[] {
  if (!Array.isArray(genres)) return [];
  const mapped: string[] = [];
  for (const g of genres) {
    const raw = typeof g?.name === "string" ? g.name.trim() : "";
    if (!raw) continue;
    const kanon = TMDB_GENRE_TO_KANON[raw.toLowerCase()];
    if (kanon) mapped.push(kanon);
  }
  return finalizeOrderedUnique(mapped);
}

/**
 * Maps a single normalized (lowercased, trimmed) Google Books category segment.
 * Conservative: unknown → null. Order matters (more specific before broad).
 */
function mapGoogleBookSegment(segment: string): string | null {
  const s = segment.trim().toLowerCase();
  if (!s) return null;

  // No strong Kanon equivalent; keep omitting.
  if (/comics?|graphic\s*novels?|manga|manhwa|webtoons?/.test(s)) return null;

  // Vague buckets only — not genre signal.
  if (s === "fiction" || s === "nonfiction" || s === "non-fiction") return null;

  if (s.includes("true crime")) return "True Crime";
  if (s.includes("coming of age") || s.includes("coming-of-age")) {
    return "Coming-of-Age";
  }

  // Before fantasy / other "fiction" buckets.
  if (s.includes("science fiction") || /\bsci-fi\b/.test(s)) return "Sci-Fi";

  // Historical before "Classic" so combined phrases skew to genre.
  if (s.includes("historical fiction")) return "Historical";
  if (s.includes("historical")) return "Historical";
  if (s.includes("history")) return "Historical";

  // Literary classics → Classic (not Contemporary).
  if (s.includes("literary classic")) return "Classic";
  // Standalone or "Classic Literature", etc. (does not match "classical" as a substring of one word wrongly).
  if (/\bclassics?\b/.test(s)) return "Classic";

  if (s.includes("psychological")) return "Psychological";

  // Crime: phrase or lone category label; skip true crime (handled above).
  if (s.includes("crime fiction")) return "Crime";
  if (s === "crime") return "Crime";

  if (s.includes("mystery fiction")) return "Mystery";
  if (s.includes("mystery")) return "Mystery";

  if (s.includes("horror fiction")) return "Horror";
  if (s.includes("horror")) return "Horror";

  if (s.includes("romance fiction")) return "Romance";
  if (s.includes("romance")) return "Romance";

  if (s.includes("fantasy fiction")) return "Fantasy";
  if (s.includes("fantasy") && !s.includes("science fiction")) return "Fantasy";

  if (s.includes("satire")) return "Satire";
  if (s.includes("humorous fiction")) return "Comedy";
  if (s.includes("humor") || s.includes("humour")) return "Comedy";

  if (s.includes("thriller")) return "Thriller";

  // Only this phrase → Contemporary; bare "literary" is too vague (criticism, movements, etc.).
  if (s.includes("literary fiction")) return "Contemporary";

  if (s.includes("biography") || s.includes("autobiography")) return "Biography";
  if (s.includes("drama")) return "Drama";
  if (/\bwar\b/.test(s) || s.includes("war stories")) return "War";
  if (s.includes("western")) return "Western";

  if (s.includes("contemporary")) return "Contemporary";

  return null;
}

/**
 * Maps `volumeInfo.categories` strings to Kanon `TAGS`.
 * Splits on `/`, trims segments, conservative segment rules, dedupes, caps at 3.
 */
export function mapGoogleBookCategoriesToKanonTags(
  categories: string[] | null | undefined,
): string[] {
  if (!Array.isArray(categories)) return [];
  const mapped: string[] = [];

  for (const cat of categories) {
    if (typeof cat !== "string") continue;
    const parts = cat
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of parts) {
      const tag = mapGoogleBookSegment(part);
      if (tag) mapped.push(tag);
    }
  }

  return finalizeOrderedUnique(mapped);
}
