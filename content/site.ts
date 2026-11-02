/**
 * Sitewide values for code routes and as the *defaults* of block fields. All of
 * it comes from env, so another show needs no code change. Editorial copy
 * editors change lives in P1 page content, not here.
 *
 * NEXT_PUBLIC_*: baked into the client bundle at build time, so set them
 * site-wide in Pantheon secrets, not per environment.
 */

export type NavLink = { label: string; href: string };

function parseNav(raw: string | undefined): NavLink[] {
  if (!raw) return [{ label: "Home", href: "/" }];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    const links = parsed.filter(
      (l): l is NavLink => !!l && typeof l.label === "string" && typeof l.href === "string",
    );
    return links.length ? links : [{ label: "Home", href: "/" }];
  } catch {
    console.warn('NEXT_PUBLIC_SITE_NAV must be JSON like [{"label":"Episodes","href":"/episodes"}]');
    return [{ label: "Home", href: "/" }];
  }
}

export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Podcast",
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE ?? "",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  /** The podcast RSS feed subscribers use. Empty = no RSS link. */
  feedUrl: process.env.NEXT_PUBLIC_FEED_URL ?? "",
  /** Empty = no Apple Podcasts link. */
  appleUrl: process.env.NEXT_PUBLIC_APPLE_PODCASTS_URL ?? "",
  nav: parseNav(process.env.NEXT_PUBLIC_SITE_NAV),
} as const;
