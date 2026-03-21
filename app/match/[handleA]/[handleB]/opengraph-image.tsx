import { ImageResponse } from "next/og";

import {
  loadPublicMatch,
  ogPersonLabel,
} from "@/lib/tasteMatch/loadPublicMatch";

export const runtime = "nodejs";
export const alt = "Taste Match — cultural compatibility on Kanon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#fafafa";
const INK = "#0a0a0a";
const MUTED = "#71717a";
const SUBTLE = "#a1a1aa";

async function imageUrlToDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url?.startsWith("http")) return null;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const mime =
      res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!mime.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 2_500_000) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function AvatarCircle({
  letter,
  src,
}: {
  letter: string;
  src: string | null;
}) {
  const initial = letter.charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      <img
        alt=""
        src={src}
        width={112}
        height={112}
        style={{
          borderRadius: 9999,
          border: "4px solid #ffffff",
          objectFit: "cover",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 112,
        height: 112,
        borderRadius: 9999,
        border: "4px solid #ffffff",
        backgroundColor: "#e4e4e7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 44,
        fontWeight: 600,
        color: "#52525b",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {`${initial}`}
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ handleA: string; handleB: string }>;
}) {
  const { handleA: rawA, handleB: rawB } = await params;
  const data = await loadPublicMatch(rawA, rawB);

  if (!data) {
    return new ImageResponse(
      (
        <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}><div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: INK, letterSpacing: "-0.03em" }}>{`Taste Match`}</div><div style={{ display: "flex", fontSize: 26, color: MUTED, marginTop: 16, fontWeight: 500 }}>{`Kanon`}</div></div>
      ),
      { ...size },
    );
  }

  const { rowA, rowB, handleA, handleB, tasteMatch } = data;
  const pct = tasteMatch.compatibilityScore;
  const labelA = ogPersonLabel(rowA, handleA);
  const labelB = ogPersonLabel(rowB, handleB);

  const [srcA, srcB] = await Promise.all([
    imageUrlToDataUri(rowA.image),
    imageUrlToDataUri(rowB.image),
  ]);

  /** Satori: newline/indent between JSX siblings becomes text nodes → breaks flex child rules. */
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", height: "100%", width: "100%", backgroundColor: BG, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}><div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, alignItems: "center", justifyContent: "center", width: "100%", height: "100%", paddingBottom: 48 }}><div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 28 }}><AvatarCircle letter={handleA} src={srcA} /><div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 72, fontSize: 36, color: SUBTLE, fontWeight: 500 }}>{`&`}</div><AvatarCircle letter={handleB} src={srcB} /></div><div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#27272a", marginBottom: 20, textAlign: "center", maxWidth: 1040, lineHeight: 1.2, letterSpacing: "-0.02em" }}>{`${labelA} and ${labelB}`}</div><div style={{ display: "flex", fontSize: 128, fontWeight: 700, color: INK, letterSpacing: "-0.045em", lineHeight: 1 }}>{`${pct}%`}</div><div style={{ display: "flex", fontSize: 30, color: MUTED, textTransform: "lowercase", letterSpacing: "0.06em", marginTop: 16, fontWeight: 400 }}>{`cultural compatibility`}</div></div><div style={{ display: "flex", position: "absolute", bottom: 36, right: 48, fontSize: 24, fontWeight: 600, color: SUBTLE, letterSpacing: "-0.02em" }}>{`Kanon`}</div></div>
    ),
    { ...size },
  );
}
