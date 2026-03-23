import type { KanonImportedItem } from "@/lib/content/kanonImportModel";
import { mapTmdbGenresToKanonTags } from "@/lib/content/mapImportTags";

function yearFromStartOfDateString(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^\d{4}/);
  if (!m) return null;
  const y = parseInt(m[0], 10);
  return Number.isFinite(y) ? y : null;
}

export function normalizeTmdbMovie(payload: any): KanonImportedItem {
  const title = typeof payload?.title === "string" ? payload.title : "";

  const originalTitle =
    typeof payload?.original_title === "string" ? payload.original_title : null;

  const year = yearFromStartOfDateString(payload?.release_date);

  const posterPath =
    typeof payload?.poster_path === "string" && payload.poster_path.length > 0
      ? payload.poster_path
      : null;
  const imageUrl = posterPath
    ? `https://image.tmdb.org/t/p/w500${posterPath}`
    : null;

  const description =
    typeof payload?.overview === "string" ? payload.overview : null;

  let director: string | null = null;
  const crew = payload?.credits?.crew;
  if (Array.isArray(crew)) {
    const row = crew.find(
      (c: { job?: string; name?: string }) =>
        c && c.job === "Director" && typeof c.name === "string" && c.name.length > 0,
    );
    director = row?.name ?? null;
  }

  const id = payload?.id;
  const externalId = id != null && id !== "" ? String(id) : "";

  return {
    type: "FILM",
    title,
    originalTitle,
    year,
    imageUrl,
    description,
    director,
    tags: mapTmdbGenresToKanonTags(payload?.genres),
    externalSource: "TMDB_MOVIE",
    externalId,
    sourceUpdatedAt: null,
    rawPayload: payload,
  };
}
