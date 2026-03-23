import type { KanonImportedItem } from "@/lib/content/kanonImportModel";

function yearFromStartOfDateString(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^\d{4}/);
  if (!m) return null;
  const y = parseInt(m[0], 10);
  return Number.isFinite(y) ? y : null;
}

export function normalizeTmdbTv(payload: any): KanonImportedItem {
  const title = typeof payload?.name === "string" ? payload.name : "";

  const originalTitle =
    typeof payload?.original_name === "string" ? payload.original_name : null;

  const year = yearFromStartOfDateString(payload?.first_air_date);

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
  const createdBy = payload?.created_by;
  if (Array.isArray(createdBy) && createdBy.length > 0) {
    const first = createdBy[0];
    if (first && typeof first.name === "string" && first.name.length > 0) {
      director = first.name;
    }
  }

  const id = payload?.id;
  const externalId = id != null && id !== "" ? String(id) : "";

  return {
    type: "SHOW",
    title,
    originalTitle,
    year,
    imageUrl,
    description,
    director,
    tags: [],
    externalSource: "TMDB_TV",
    externalId,
    sourceUpdatedAt: null,
    rawPayload: payload,
  };
}
