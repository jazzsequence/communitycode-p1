import { describe, expect, it } from "vitest";
import { loadConfig, pick } from "@/lib/config";
import { formEndpoint } from "@/lib/forms/endpoints";
import { siteConfig } from "@/site.config";

describe("pick", () => {
  it("prefers env, then the file, and treats blank as unset", () => {
    expect(pick("env", "file")).toBe("env");
    expect(pick("  ", "file")).toBe("file");
    expect(pick(undefined, " file ")).toBe("file");
    expect(pick(undefined, undefined)).toBeUndefined();
    expect(pick("", "")).toBeUndefined();
  });
});

describe("loadConfig with a site config file", () => {
  const file = {
    wordpress: { baseUrl: "https://file.example/", feedPath: "/f.xml", userAgent: "file-ua/1" },
    showfm: { podcastSlug: "file-show", apiBase: "https://api.file.example/v1/" },
  };

  it("uses the file when env is empty", () => {
    const c = loadConfig({}, file);
    expect(c.wordpress).toEqual({
      baseUrl: "https://file.example",
      feedPath: "/f.xml",
      userAgent: "file-ua/1",
      bypassToken: undefined,
    });
    expect(c.showfm).toEqual({ apiBase: "https://api.file.example/v1", podcastSlug: "file-show", apiKey: undefined });
    expect(c.transcriptHosts).toEqual(["file.example", "m.cdn.media"]);
  });

  it("lets env override each file value", () => {
    const c = loadConfig(
      { WP_BASE_URL: "https://env.example", SHOWFM_PODCAST_SLUG: "env-show", WP_USER_AGENT: "env-ua/2" },
      file,
    );
    expect(c.wordpress?.baseUrl).toBe("https://env.example");
    expect(c.wordpress?.userAgent).toBe("env-ua/2");
    expect(c.showfm?.podcastSlug).toBe("env-show");
  });

  it("is a pure function of env when no file is passed", () => {
    expect(loadConfig({})).toEqual({ wordpress: null, showfm: null, transcriptHosts: [] });
  });

  it("still validates a bad value that came from the file", () => {
    expect(() => loadConfig({}, { wordpress: { baseUrl: "not a url" } })).toThrow(/WP_BASE_URL/);
    expect(() => loadConfig({}, { showfm: { podcastSlug: "bad slug!" } })).toThrow(/SHOWFM_PODCAST_SLUG/);
  });
});

describe("formEndpoint", () => {
  const file = { contactEndpoint: "https://file.example/contact", newsletterEndpoint: "https://file.example/news" };

  it("falls back to the file, and env overrides it", () => {
    expect(formEndpoint("contact", {}, file)).toBe("https://file.example/contact");
    expect(formEndpoint("newsletter", {}, file)).toBe("https://file.example/news");
    expect(formEndpoint("contact", { CONTACT_ENDPOINT: " https://env.example/c " }, file)).toBe("https://env.example/c");
    expect(formEndpoint("newsletter", { NEWSLETTER_ENDPOINT: "https://env.example/n" }, file)).toBe(
      "https://env.example/n",
    );
  });

  it("is undefined when neither is set, so the route answers 501", () => {
    expect(formEndpoint("contact", {}, {})).toBeUndefined();
    expect(formEndpoint("contact", { CONTACT_ENDPOINT: "  " }, {})).toBeUndefined();
  });
});

describe("the committed site.config.ts", () => {
  it("holds no secret-looking values", () => {
    const text = JSON.stringify(siteConfig).toLowerCase();
    for (const word of ["secret", "token", "apikey", "api_key", "bearer"]) expect(text).not.toContain(word);
  });

  it("has absolute http(s) URLs for every endpoint and base", () => {
    const urls = [
      siteConfig.wordpress?.baseUrl,
      siteConfig.forms?.contactEndpoint,
      siteConfig.forms?.newsletterEndpoint,
    ].filter(Boolean) as string[];
    for (const u of urls) expect(["http:", "https:"]).toContain(new URL(u).protocol);
  });
});
