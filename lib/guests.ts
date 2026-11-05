import type { Episode } from "@/lib/episodes/types";
import { safeImageUrl } from "@/lib/safe-link";

export interface GuestAppearance {
  slug: string;
  title: string;
  season: number | null;
  number: number | null;
}

export interface AggregatedGuest {
  name: string;
  photoUrl: string | null;
  role: string | null;
  /** Newest first. */
  episodes: GuestAppearance[];
}

export interface GuestsResponse {
  guests: AggregatedGuest[];
}

/** Case-insensitive, whitespace-insensitive identity for a person's name. */
function nameKey(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

function time(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Default for the GuestGrid "hide these roles" field: show.fm `people` can include hosts. */
export const DEFAULT_HOST_ROLES = "host|co-host";

/**
 * Drop people whose role matches `pattern` (case-insensitive regex source, an
 * editor-supplied field). Empty pattern hides nobody; an invalid or oversized one
 * falls back to the default rather than throwing in render.
 */
export function excludeRoles<T extends { role: string | null }>(guests: readonly T[], pattern: string | undefined): T[] {
  const source = (pattern ?? DEFAULT_HOST_ROLES).trim();
  if (!source) return [...guests];
  let re: RegExp;
  try {
    re = new RegExp(source.length > 100 ? DEFAULT_HOST_ROLES : source, "i");
  } catch {
    re = new RegExp(DEFAULT_HOST_ROLES, "i");
  }
  return guests.filter((g) => !(g.role && re.test(g.role)));
}

/**
 * One entry per person across every episode. Deduped case-insensitively, so a
 * guest who appears twice has two episodes. Ordered by most recent appearance,
 * then name. Roles are returned as-is; hiding hosts is the block's `excludeRoles` field.
 */
export function aggregateGuests(episodes: readonly Episode[]): AggregatedGuest[] {
  // Newest first so the first sighting supplies the display name, photo and role.
  const newestFirst = [...episodes].sort((a, b) => time(b.publishedAt) - time(a.publishedAt));
  const byKey = new Map<string, AggregatedGuest & { latest: number }>();

  for (const ep of newestFirst) {
    for (const g of ep.guests) {
      const name = g.name.trim().replace(/\s+/g, " ");
      if (!name) continue;
      const key = nameKey(name);
      const appearance: GuestAppearance = { slug: ep.slug, title: ep.title, season: ep.season, number: ep.number };
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          name,
          photoUrl: safeImageUrl(g.photoUrl),
          role: g.role,
          episodes: [appearance],
          latest: time(ep.publishedAt),
        });
        continue;
      }
      // The same person can be credited twice on one episode; list it once.
      if (!existing.episodes.some((x) => x.slug === ep.slug)) existing.episodes.push(appearance);
      existing.photoUrl ??= safeImageUrl(g.photoUrl);
      existing.role ??= g.role;
    }
  }

  return [...byKey.values()]
    .sort((a, b) => b.latest - a.latest || a.name.localeCompare(b.name, "en"))
    .map(({ latest: _latest, ...guest }) => guest);
}

/** "Jane Doe" -> "JD"; one word -> one letter. Deterministic, safe to SSR. */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  if (!words.length) return "?";
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return (first + last).toUpperCase();
}
