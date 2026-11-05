/** "43:28" / "1:02:03" for display, from seconds. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** "October 14, 2026". Fixed locale + UTC so server and client render the same
 *  string (a mismatch is a hydration error). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(d);
}

/** "S2 E36", "S2", "E36", or "". */
export function formatEpisodeLabel(season: number | null, number: number | null): string {
  return [season !== null ? `S${season}` : "", number !== null ? `E${number}` : ""].filter(Boolean).join(" ");
}
