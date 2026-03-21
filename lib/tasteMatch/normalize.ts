export function normalizeMatchHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}
