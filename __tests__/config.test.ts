import { describe, expect, it } from "vitest";
import { ConfigError, isAllowedTranscriptUrl, loadConfig } from "@/lib/config";

describe("loadConfig", () => {
  it("disables backends that are not configured", () => {
    expect(loadConfig({})).toEqual({ wordpress: null, showfm: null, transcriptHosts: [] });
  });

  it("reads WordPress and show.fm from env, with no site-specific defaults", () => {
    const c = loadConfig({
      WP_BASE_URL: "https://example.org/",
      WP_FEED_PATH: "podcast.xml",
      PANTHEON_BOT_BYPASS_TOKEN: " tok ",
      SHOWFM_PODCAST_SLUG: "my-show",
      SHOWFM_API_KEY: "k",
    });
    expect(c.wordpress).toEqual({ baseUrl: "https://example.org", feedPath: "/podcast.xml", bypassToken: "tok" });
    expect(c.showfm).toEqual({ apiBase: "https://api.show.fm/v1", podcastSlug: "my-show", apiKey: "k" });
    expect(c.transcriptHosts).toEqual(["example.org"]);
  });

  it("uses PowerPress's standard feed path only as a generic default", () => {
    expect(loadConfig({ WP_BASE_URL: "https://a.test" }).wordpress?.feedPath).toBe("/feed/podcast/");
  });

  it("keeps a WordPress install in a subdirectory", () => {
    expect(loadConfig({ WP_BASE_URL: "https://a.test/blog/" }).wordpress?.baseUrl).toBe("https://a.test/blog");
  });

  it("merges extra transcript hosts, lowercased and de-duplicated", () => {
    const c = loadConfig({ WP_BASE_URL: "https://A.test", TRANSCRIPT_ALLOWED_HOSTS: "CDN.show.fm, a.test ," });
    expect(c.transcriptHosts).toEqual(["a.test", "cdn.show.fm"]);
  });

  it.each([
    [{ WP_BASE_URL: "not a url" }],
    [{ WP_BASE_URL: "ftp://a.test" }],
    [{ SHOWFM_PODCAST_SLUG: "has spaces" }],
    [{ SHOWFM_PODCAST_SLUG: "../x" }],
    [{ SHOWFM_API_BASE: "javascript:alert(1)" }],
  ])("rejects invalid config %j with a ConfigError", (env) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
  });
});

describe("isAllowedTranscriptUrl (SSRF guard)", () => {
  const hosts = ["communitycode.dev", "cdn.show.fm"];
  it("allows https on an allowed host", () => {
    expect(isAllowedTranscriptUrl("https://communitycode.dev/app/uploads/a.vtt", hosts)).toBe(true);
    expect(isAllowedTranscriptUrl("https://CDN.show.fm/t.vtt", hosts)).toBe(true);
  });
  it.each([
    "http://communitycode.dev/a.vtt",
    "https://communitycode.dev.evil.example/a.vtt",
    "https://evil.example/communitycode.dev",
    "https://communitycode.dev@evil.example/a.vtt",
    "https://user:pw@communitycode.dev/a.vtt",
    "http://169.254.169.254/latest/meta-data",
    "file:///etc/passwd",
    "//communitycode.dev/a.vtt",
    "not a url",
    "",
  ])("rejects %s", (u) => {
    expect(isAllowedTranscriptUrl(u, hosts)).toBe(false);
  });
});
