import type { Guest } from "./types";

/**
 * Guests are not a field in the WordPress feed or REST payload, but every
 * episode title carries the name: "Episode 36: Jacquie Capur",
 * "Episode 29 – Robert Abela". Non-episode items ("Episode 0: Community + Code",
 * announcements, season breaks) have no guest.
 *
 * Titles must already be entity-decoded (the XML parser does that).
 */

const EPISODE_PREFIX = /^\s*episode\s+(\d+)\s*[:–—-]\s*(.+?)\s*$/i;

/** Show title and other non-person suffixes that follow "Episode N:". */
const NOT_A_PERSON = /^(community\s*\+\s*code|trailer|intro(duction)?|bonus.*)$/i;

/** "A & B", "A and B", "A, B" -> separate guests. */
const GUEST_SEPARATOR = /\s*(?:,|&|\band\b)\s*/i;

export function episodeNumberFromTitle(title: string): number | null {
  const m = EPISODE_PREFIX.exec(title);
  return m ? Number(m[1]) : null;
}

export function parseGuestsFromTitle(title: string): Guest[] {
  const m = EPISODE_PREFIX.exec(title);
  if (!m) return [];
  const rest = m[2];
  if (NOT_A_PERSON.test(rest)) return [];
  return rest
    .split(GUEST_SEPARATOR)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, role: "Guest", photoUrl: null }));
}
