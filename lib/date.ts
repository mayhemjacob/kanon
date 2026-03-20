function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** e.g. "March 18, 2026" */
function formatEnglishLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Review timestamp for cards: same calendar day → relative ("3h ago");
 * otherwise → absolute date in English ("March 18, 2026").
 */
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  if (!isSameLocalCalendarDay(d, now)) {
    return formatEnglishLongDate(d);
  }

  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${diffHours}h ago`;
}

/**
 * Returns a formatted date and time for display (e.g. "March 19, 2026 at 12:30 PM").
 */
export function formatReviewDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr} at ${timeStr}`;
}
