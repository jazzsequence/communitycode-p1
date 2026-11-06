/**
 * Sitewide values for code routes and as the *defaults* of block fields. They
 * come from site.config.ts; a NEXT_PUBLIC_* env var overrides the matching
 * value, so another show needs no code change. Editorial copy editors change
 * lives in P1 page content, not here.
 *
 * NEXT_PUBLIC_*: baked into the client bundle at build time. Keep each
 * `process.env.NEXT_PUBLIC_X` reference literal (Next inlines them by name).
 */
import { siteConfig } from "@/site.config";

export type NavLink = { label: string; href: string };

const FALLBACK_NAV: NavLink[] = [{ label: "Home", href: "/" }];

function validLinks(parsed: unknown): NavLink[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (l): l is NavLink => !!l && typeof l.label === "string" && typeof l.href === "string",
  );
}

function parseNav(raw: string | undefined, fromFile: unknown): NavLink[] {
  const fallback = validLinks(fromFile);
  const base = fallback.length ? fallback : FALLBACK_NAV;
  if (!raw) return base;
  try {
    const links = validLinks(JSON.parse(raw));
    return links.length ? links : base;
  } catch {
    console.warn('NEXT_PUBLIC_SITE_NAV must be JSON like [{"label":"Episodes","href":"/episodes"}]');
    return base;
  }
}

const file = siteConfig.site;

export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || file.name || "Podcast",
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE ?? file.tagline ?? "",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? file.url ?? "",
  /** The podcast RSS feed subscribers use. Empty = no RSS link. */
  feedUrl: process.env.NEXT_PUBLIC_FEED_URL ?? file.feedUrl ?? "",
  /** Empty = no Apple Podcasts link. */
  appleUrl: process.env.NEXT_PUBLIC_APPLE_PODCASTS_URL ?? file.appleUrl ?? "",
  nav: parseNav(process.env.NEXT_PUBLIC_SITE_NAV, file.nav),
} as const;
