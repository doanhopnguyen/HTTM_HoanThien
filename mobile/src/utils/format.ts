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
/** UPPER_SNAKE_CASE to readable words. */
export function words(value: string) {
  return value.replaceAll("_", " ");
}
