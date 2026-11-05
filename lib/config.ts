import "server-only";

/**
 * The single place site-specific values enter the server code. Nothing about
 * Community + Code (hostnames, slugs, feed paths) is hardcoded in the data
 * layer: point these env vars at another show and the same code serves it.
 *
 * A backend whose variables are unset is *disabled*, not defaulted: a
 * WordPress-less deployment just leaves WP_BASE_URL empty.
 */

export class ConfigError extends Error {}

export interface AppConfig {
  wordpress: { baseUrl: string; feedPath: string; bypassToken?: string } | null;
  showfm: { apiBase: string; podcastSlug: string; apiKey?: string } | null;
  /**
   * Hostnames server-side code may fetch transcripts from (an SSRF guard, since
   * the URL comes from a third-party feed). The WordPress host is included
   * automatically; add others (e.g. show.fm's media host) via
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

export function loadConfig(env: Env = process.env): AppConfig {
  const wpRaw = env.WP_BASE_URL?.trim();
  const wpUrl = wpRaw ? httpUrl("WP_BASE_URL", wpRaw) : null;

  const feedPath = env.WP_FEED_PATH?.trim() || DEFAULT_FEED_PATH;

  const slug = env.SHOWFM_PODCAST_SLUG?.trim();
  if (slug && !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    throw new ConfigError(`SHOWFM_PODCAST_SLUG must be a slug (letters, digits, dashes), got "${slug}"`);
  }
  const apiBase = (env.SHOWFM_API_BASE?.trim() || DEFAULT_SHOWFM_API_BASE).replace(/\/+$/, "");
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
          bypassToken: env.PANTHEON_BOT_BYPASS_TOKEN?.trim() || undefined,
        }
      : null,
    showfm: slug ? { apiBase, podcastSlug: slug, apiKey: env.SHOWFM_API_KEY?.trim() || undefined } : null,
    transcriptHosts: [...new Set([...(wpUrl ? [wpUrl.hostname.toLowerCase()] : []), ...extraHosts])],
  };
}

let cached: AppConfig | undefined;

/** Process-wide config. Throws ConfigError with a readable message when invalid. */
export function getConfig(): AppConfig {
  return (cached ??= loadConfig());
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
