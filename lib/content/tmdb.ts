const TMDB_BASE = "https://api.themoviedb.org/3";

function getTmdbApiKey(): string {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "TMDB_API_KEY is missing or empty. Set it in your environment (e.g. .env.local) to call TMDb.",
    );
  }
  return key;
}

/**
 * GET a TMDb API v3 path (e.g. `/movie/550`) with the API key applied.
 */
export async function tmdbFetch<T = unknown>(
  path: string,
  searchParams?: Record<string, string>,
): Promise<T> {
  const apiKey = getTmdbApiKey();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${TMDB_BASE}${normalized}`);
  url.searchParams.set("api_key", apiKey);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `TMDb request failed (${res.status} ${res.statusText}): ${body.slice(0, 300)}`,
    );
  }
  return res.json() as Promise<T>;
}

export function fetchTmdbMovieDetails(movieId: number | string) {
  const id = encodeURIComponent(String(movieId));
  return tmdbFetch(`/movie/${id}`, { append_to_response: "credits" });
}

export function fetchTmdbTvDetails(tvId: number | string) {
  const id = encodeURIComponent(String(tvId));
  return tmdbFetch(`/tv/${id}`, { append_to_response: "credits" });
}

/** Response shape for `/movie/popular` and `/tv/popular` (subset). */
export type TmdbPopularListResponse = {
  page?: number;
  results?: Array<{ id?: number }>;
  total_pages?: number;
  total_results?: number;
};

export function fetchTmdbPopularMovies(page: number = 1) {
  return tmdbFetch<TmdbPopularListResponse>("/movie/popular", {
    page: String(page),
  });
}

export function fetchTmdbPopularTv(page: number = 1) {
  return tmdbFetch<TmdbPopularListResponse>("/tv/popular", {
    page: String(page),
  });
}

/** `/search/movie` response (subset). */
export type TmdbMovieSearchResponse = {
  page?: number;
  results?: TmdbMovieSearchResult[];
  total_pages?: number;
  total_results?: number;
};

export type TmdbMovieSearchResult = {
  id?: number;
  title?: string;
  original_title?: string;
  release_date?: string;
};

/**
 * Search movies by title; optional release year narrows TMDb results.
 */
export function searchTmdbMovies(query: string, year?: number) {
  const params: Record<string, string> = { query };
  if (year !== undefined && Number.isFinite(year)) {
    params.year = String(year);
  }
  return tmdbFetch<TmdbMovieSearchResponse>("/search/movie", params);
}
