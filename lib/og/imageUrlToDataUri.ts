/**
 * Fetch a remote image for OG generation (Satori accepts data URIs in <img src>).
 * Same limits as Taste Match `opengraph-image` — keep in sync when changing either.
 */
export async function imageUrlToDataUri(
  url: string | null | undefined,
): Promise<string | null> {
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
