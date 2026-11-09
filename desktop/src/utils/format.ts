/** Locale date-time, or an em dash for missing values. */
export function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}
/** AI confidence (0–1) as a percentage. */
export function confidence(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : `${Math.round(value * 100)}%`;
}
/** Seconds as a compact duration, e.g. "3m 20s". */
export function duration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "—";
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${total % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
