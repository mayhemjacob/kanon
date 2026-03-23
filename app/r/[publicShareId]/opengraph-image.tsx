import { ImageResponse } from "next/og";

import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";
import { imageUrlToDataUri } from "@/lib/og/imageUrlToDataUri";
import {
  itemTypeLabel,
  loadPublicReviewShare,
  reviewerDisplayLabel,
} from "@/lib/publicReview/loadPublicReviewShare";

export const runtime = "nodejs";
export const alt = "Review on Kanon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
/** Keep social previews reasonably fresh after edits without hammering origin images. */
export const revalidate = 120;

/** Main card (review present) — dark, minimal. */
const BG = "#09090b";
const SURFACE = "#18181b";
const INK = "#fafafa";
const MUTED = "#a1a1aa";
const SUBTLE = "#71717a";

/** Missing review token — same palette as Taste Match OG fallback for consistency. */
const FALLBACK_BG = "#fafafa";
const FALLBACK_INK = "#0a0a0a";
const FALLBACK_MUTED = "#71717a";

async function posterSrcForOg(stored: string | null | undefined): Promise<string | null> {
  const normalized = normalizeItemImageUrlForNext(stored);
  if (!normalized) return null;
  if (normalized.startsWith("data:")) return normalized;
  if (normalized.startsWith("http")) return imageUrlToDataUri(normalized);
  return null;
}

/** Character cap so Satori layout stays stable (no reliance on line-clamp). */
function truncateForOg(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function reflectionExcerpt(body: string | null | undefined, max = 120): string {
  const t = body?.replace(/\s+/g, " ").trim() ?? "";
  if (!t) return "A review on Kanon";
  return truncateForOg(t, max);
}

function ratingText(rating: number): string {
  if (!Number.isFinite(rating)) return "—";
  return Number(rating) === Math.floor(rating) ? String(rating) : rating.toFixed(1);
}

export default async function Image({
  params,
}: {
  params: Promise<{ publicShareId: string }>;
}) {
  const { publicShareId } = await params;
  const data = await loadPublicReviewShare(publicShareId ?? "");

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: FALLBACK_BG,
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 700,
              color: FALLBACK_INK,
              letterSpacing: "-0.03em",
            }}
          >
            Review on Kanon
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: FALLBACK_MUTED,
              marginTop: 16,
              fontWeight: 500,
            }}
          >
            Kanon
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const { item, user, rating, body } = data;
  const reviewer = reviewerDisplayLabel(user.handle, user.name);
  const type = itemTypeLabel(item.type);
  const yearPart =
    item.year != null ? `${item.year}` : "";
  const metaLine = [yearPart, type].filter(Boolean).join(" · ");
  const poster = await posterSrcForOg(item.imageUrl);
  const excerpt = reflectionExcerpt(body);
  const rText = ratingText(rating);
  const titleForOg = truncateForOg(item.title, 52);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          backgroundColor: BG,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 380,
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: 56,
            flexShrink: 0,
          }}
        >
          {poster ? (
            <img
              alt=""
              src={poster}
              width={314}
              height={471}
              style={{
                objectFit: "cover",
                borderRadius: 14,
                boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
              }}
            />
          ) : (
            <div
              style={{
                width: 314,
                height: 471,
                borderRadius: 14,
                backgroundColor: SURFACE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: SUBTLE,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
              }}
            >
              Kanon
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            paddingTop: 52,
            paddingRight: 56,
            paddingBottom: 52,
            paddingLeft: 12,
            minWidth: 0,
          }}
        >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                justifyContent: "center",
              }}
            >
            <div
              style={{
                display: "flex",
                fontSize: 46,
                fontWeight: 600,
                color: INK,
                lineHeight: 1.12,
                letterSpacing: "-0.035em",
                maxHeight: 160,
                overflow: "hidden",
              }}
            >
              {titleForOg}
            </div>
            {metaLine ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: MUTED,
                  marginTop: 14,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
              >
                {metaLine}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: SUBTLE,
                marginTop: 28,
                fontWeight: 500,
                maxWidth: 720,
                overflow: "hidden",
              }}
            >
              {truncateForOg(reviewer, 40)}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "baseline",
                marginTop: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 112,
                  fontWeight: 700,
                  color: INK,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                }}
              >
                {rText}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  color: MUTED,
                  fontWeight: 500,
                  paddingBottom: 8,
                  marginLeft: 12,
                }}
              >
                /10
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: MUTED,
                marginTop: 28,
                lineHeight: 1.45,
                maxHeight: 110,
                overflow: "hidden",
              }}
            >
              {excerpt}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 36,
            right: 48,
            fontSize: 22,
            fontWeight: 600,
            color: SUBTLE,
            letterSpacing: "-0.02em",
          }}
        >
          Kanon
        </div>
      </div>
    ),
    { ...size },
  );
}
