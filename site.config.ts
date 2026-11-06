/**
 * Site-specific configuration that is NOT secret: hostnames, slugs, public
 * links, form endpoints and the default nav. This is the one file another show
 * edits to reuse this code; nothing in components or lib/ names a site.
 *
 * Environment variables still win over anything here (handy for pointing a
 * preview at another backend), so a value that is also set in the environment
 * is overridden by the environment. Leave a value out, or empty, to disable
 * the feature that needs it.
 *
 * Secrets never go here: this file is committed and, for `site`, ends up in
 * the client bundle. Keep CONTACT_SECRET, NEWSLETTER_SECRET, SHOWFM_API_KEY,
 * CSS_API_KEY and PANTHEON_BOT_BYPASS_TOKEN in Pantheon secrets / .env.local.
 */

export interface SiteConfig {
  /** Shown in the header, footer, metadata and as block-field defaults. Client-visible. */
  site: {
    name: string;
    tagline?: string;
    /** Canonical origin, e.g. "https://www.example.com". Empty = relative URLs. */
    url?: string;
    /** The RSS feed subscribers use. Empty = no RSS link. */
    feedUrl?: string;
    /** Empty = no Apple Podcasts link. */
    appleUrl?: string;
    /** Header/footer default links (editable per block in the editor). */
    nav: { label: string; href: string }[];
  };
  /** The WordPress site that is the CMS (episodes, uploads, blog). Empty baseUrl = disabled. */
  wordpress?: { baseUrl?: string; feedPath?: string; userAgent?: string };
  /** show.fm as an episode source. Empty podcastSlug = disabled. */
  showfm?: { podcastSlug?: string; apiBase?: string };
  /**
   * Where the form routes forward to (server-side). The matching *_SECRET
   * must also be set, or the route answers 501.
   */
  forms?: { contactEndpoint?: string; newsletterEndpoint?: string };
}

export const siteConfig: SiteConfig = {
  site: {
    name: "Community + Code",
    tagline: "A podcast about the people behind the commits",
    feedUrl: "https://communitycode.dev/episodes/feed/episodes/",
    appleUrl: "https://podcasts.apple.com/us/podcast/community-+-code/id1813475905",
    nav: [
      { label: "Episodes", href: "/episodes" },
      { label: "Blog", href: "/blog" },
      { label: "About", href: "/about" },
      { label: "Be a guest", href: "/be-a-guest" },
      { label: "Subscribe", href: "/subscribe" },
    ],
  },
  wordpress: {
    baseUrl: "https://communitycode.dev",
    feedPath: "/episodes/feed/episodes/",
  },
  showfm: {
    podcastSlug: "communitycode",
  },
  forms: {
    contactEndpoint: "https://communitycode.dev/wp-json/community-code/v1/contact",
    newsletterEndpoint: "https://communitycode.dev/wp-json/community-code/v1/newsletter",
  },
};
