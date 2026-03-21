export function normalizeClashHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}
