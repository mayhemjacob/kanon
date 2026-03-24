import { ImageResponse } from "next/og";

import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";
import { imageUrlToDataUri } from "@/lib/og/imageUrlToDataUri";
import {
  listCuratorLabel,
  loadPublicListShare,
} from "@/lib/publicList/loadPublicListShare";

export const runtime = "nodejs";
export const alt = "List on Kanon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 120;

const BG = "#0b0b0d";
const SURFACE = "#151518";
const INK = "#fafafa";
const MUTED = "#a1a1aa";
const SUBTLE = "#71717a";

function truncateForOg(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function coverSrcForOg(stored: string | null | undefined): Promise<string | null> {
  const normalized = normalizeItemImageUrlForNext(stored ?? null);
  if (!normalized) return null;
  if (normalized.startsWith("data:")) return normalized;
  if (normalized.startsWith("http")) return imageUrlToDataUri(normalized);
  return null;
}

function safeListTitle(title: string | null | undefined): string {
  const t = title?.trim();
  if (t) return truncateForOg(t, 56);
  return "Curated List";
}

export default async function Image({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const list = await loadPublicListShare(listId ?? "");

  if (!list) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            backgroundColor: BG,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 58,
              color: INK,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            List on Kanon
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 28,
              color: MUTED,
            }}
          >
            Curated recommendations
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const curator = truncateForOg(
    listCuratorLabel(list.owner.handle, list.owner.name),
    40,
  );
  const title = safeListTitle(list.title);
  const description = truncateForOg(
    list.description?.trim() || "A curated list on Kanon",
    130,
  );
  const countLine = `${list.items.length} ${
    list.items.length === 1 ? "recommendation" : "recommendations"
  }`;

  const firstThree = list.items.slice(0, 3).map((row) => row.item.imageUrl);
  const [coverA, coverB, coverC] = await Promise.all([
    coverSrcForOg(firstThree[0]),
    coverSrcForOg(firstThree[1]),
    coverSrcForOg(firstThree[2]),
  ]);
  const covers = [coverA, coverB, coverC];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: BG,
          color: INK,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          position: "relative",
          padding: "52px 56px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "62%",
            minWidth: 0,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: MUTED,
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}
            >
              {curator}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 68,
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
                fontWeight: 700,
                maxHeight: 230,
                overflow: "hidden",
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 28,
                color: MUTED,
                lineHeight: 1.3,
                maxHeight: 80,
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: SUBTLE,
                letterSpacing: "0.01em",
                fontWeight: 500,
              }}
            >
              {countLine}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 20,
                fontSize: 34,
                letterSpacing: "-0.03em",
                fontWeight: 700,
              }}
            >
              Kanon
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "38%",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 14,
          }}
        >
          {covers.map((cover, index) =>
            cover ? (
              <img
                key={index}
                alt=""
                src={cover}
                width={index === 1 ? 184 : 164}
                height={index === 1 ? 276 : 246}
                style={{
                  borderRadius: 14,
                  objectFit: "cover",
                  boxShadow: "0 20px 44px rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  transform: index === 0 ? "translateY(14px)" : index === 2 ? "translateY(-14px)" : "none",
                }}
              />
            ) : (
              <div
                key={index}
                style={{
                  width: index === 1 ? 184 : 164,
                  height: index === 1 ? 276 : 246,
                  borderRadius: 14,
                  backgroundColor: SURFACE,
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: SUBTLE,
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  transform: index === 0 ? "translateY(14px)" : index === 2 ? "translateY(-14px)" : "none",
                }}
              >
                Kanon
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
