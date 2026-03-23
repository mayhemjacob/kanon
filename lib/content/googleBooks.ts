const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1";

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
/** Delays after attempt 1 and 2 fail with a retryable status (ms). */
const RETRY_DELAYS_MS = [500, 1000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGoogleBooksApiKey(): string {
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GOOGLE_BOOKS_API_KEY is missing or empty. Set it in your environment (e.g. .env.local) to call Google Books.",
    );
  }
  return key;
}

/**
 * GET a Google Books API path (e.g. `/volumes` or `/volumes/xyz`) with the API key applied.
 */
export async function googleBooksFetch<T = unknown>(
  path: string,
  searchParams?: Record<string, string>,
): Promise<T> {
  const apiKey = getGoogleBooksApiKey();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${GOOGLE_BOOKS_BASE}${normalized}`);
  url.searchParams.set("key", apiKey);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const urlString = url.toString();

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(urlString);
    if (res.ok) {
      return res.json() as Promise<T>;
    }

    const body = await res.text();
    const snippet = body.slice(0, 300);
    const isLastAttempt = attempt === 2;
    const retryable = RETRYABLE_STATUSES.has(res.status);

    if (isLastAttempt || !retryable) {
      const suffix =
        isLastAttempt && retryable
          ? " Retries exhausted for this transient error; try again later."
          : "";
      throw new Error(
        `Google Books request failed (${res.status} ${res.statusText}, attempt ${attempt + 1}/3): ${snippet}${suffix}`,
      );
    }

    await sleep(RETRY_DELAYS_MS[attempt]!);
  }

  throw new Error("Google Books: unexpected end of retry loop.");
}

export function searchGoogleBooks(query: string, maxResults = 5) {
  const q = query.trim();
  if (!q) {
    throw new Error("searchGoogleBooks: query must be a non-empty string.");
  }
  const capped = Math.min(Math.max(1, maxResults), 40);
  return googleBooksFetch("/volumes", {
    q,
    maxResults: String(capped),
  });
}

export function fetchGoogleBookById(volumeId: string) {
  const id = volumeId.trim();
  if (!id) {
    throw new Error("fetchGoogleBookById: volumeId must be a non-empty string.");
  }
  return googleBooksFetch(`/volumes/${encodeURIComponent(id)}`);
}
