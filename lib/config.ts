import "server-only";
import { siteConfig, type SiteConfig } from "@/site.config";

/**
 * The single place site-specific values enter the server code. Nothing about
 * Community + Code (hostnames, slugs, feed paths) is hardcoded in the data
 * layer: the values live in site.config.ts (non-secret, committed) and can be
 * overridden by env vars, so the same code serves another show.
 *
 * A backend whose values are unset is *disabled*, not defaulted: a
 * WordPress-less deployment just leaves wordpress.baseUrl empty.
 */

export class ConfigError extends Error {}

export interface AppConfig {
  wordpress: { baseUrl: string; feedPath: string; userAgent?: string; bypassToken?: string } | null;
  showfm: { apiBase: string; podcastSlug: string; apiKey?: string } | null;
  /**
   * Hostnames server-side code may fetch transcripts from (an SSRF guard, since
   * the URL comes from a third-party feed). The WordPress host and, when show.fm
   * is configured, show.fm's media CDN are included automatically; add others via
   * TRANSCRIPT_ALLOWED_HOSTS.
   */
  transcriptHosts: string[];
}

type Env = Record<string, string | undefined>;

function httpUrl(name: string, value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(`${name} must be an absolute URL, got "${value}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ConfigError(`${name} must be http(s), got "${url.protocol}"`);
  }
  return url;
}

export const DEFAULT_SHOWFM_API_BASE = "https://api.show.fm/v1";
export const DEFAULT_FEED_PATH = "/feed/podcast/"; // PowerPress's standard path
/**
 * Sent to WordPress. Pantheon's `gcdn:ua-bypass` matches the full string exactly
 * (case-sensitive, version included), so whatever is allowlisted must equal this.
 * Override with WP_USER_AGENT.
 */
export const DEFAULT_WP_USER_AGENT = "communitycode-p1/1.0";
/** show.fm serves hosted audio and transcripts from here. Part of the vendor, not the site. */
export const SHOWFM_MEDIA_HOSTS = ["m.cdn.media"];

/** The non-secret values from site.config.ts that this module layers under env. */
export type FileConfig = Pick<SiteConfig, "wordpress" | "showfm">;

/** env wins, then the site config file; blank counts as unset. */
export function pick(envValue: string | undefined, fileValue: string | undefined): string | undefined {
  return envValue?.trim() || fileValue?.trim() || undefined;
}

/**
 * `file` defaults to empty so a call with only `env` is a pure function of env
 * (what the tests rely on); `getConfig()` passes the real site.config.ts.
 */
export function loadConfig(env: Env = process.env, file: FileConfig = {}): AppConfig {
  const wpRaw = pick(env.WP_BASE_URL, file.wordpress?.baseUrl);
  const wpUrl = wpRaw ? httpUrl("WP_BASE_URL", wpRaw) : null;

  const feedPath = pick(env.WP_FEED_PATH, file.wordpress?.feedPath) || DEFAULT_FEED_PATH;

  const slug = pick(env.SHOWFM_PODCAST_SLUG, file.showfm?.podcastSlug);
  if (slug && !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    throw new ConfigError(`SHOWFM_PODCAST_SLUG must be a slug (letters, digits, dashes), got "${slug}"`);
  }
  const apiBase = (pick(env.SHOWFM_API_BASE, file.showfm?.apiBase) || DEFAULT_SHOWFM_API_BASE).replace(/\/+$/, "");
  httpUrl("SHOWFM_API_BASE", apiBase);

  const extraHosts = (env.TRANSCRIPT_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  return {
    wordpress: wpUrl
      ? {
          baseUrl: wpUrl.origin + wpUrl.pathname.replace(/\/+$/, ""),
          feedPath: feedPath.startsWith("/") ? feedPath : `/${feedPath}`,
          userAgent: pick(env.WP_USER_AGENT, file.wordpress?.userAgent) || DEFAULT_WP_USER_AGENT,
          bypassToken: env.PANTHEON_BOT_BYPASS_TOKEN?.trim() || undefined,
        }
      : null,
    showfm: slug ? { apiBase, podcastSlug: slug, apiKey: env.SHOWFM_API_KEY?.trim() || undefined } : null,
    transcriptHosts: [
      ...new Set([
        ...(wpUrl ? [wpUrl.hostname.toLowerCase()] : []),
        ...(slug ? SHOWFM_MEDIA_HOSTS : []),
        ...extraHosts,
      ]),
    ],
  };
}

let cached: AppConfig | undefined;

/** Process-wide config. Throws ConfigError with a readable message when invalid. */
export function getConfig(): AppConfig {
  return (cached ??= loadConfig(process.env, siteConfig));
}

/** Is `url` an https URL on a host transcripts may be fetched from? */
export function isAllowedTranscriptUrl(url: string, hosts: readonly string[] = getConfig().transcriptHosts): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  // Exact host match only: "communitycode.dev.evil.example" must not pass.
  return u.protocol === "https:" && !u.username && !u.password && hosts.includes(u.hostname.toLowerCase());
}
