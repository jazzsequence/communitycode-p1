import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  EpisodeDetail,
  buildEpisodeJsonLd,
  episodeCanonicalUrl,
  episodeMetaDescription,
  safeJsonLd,
} from "@/components/podcast/episode-detail";
import { site } from "@/content/site";
import { sanitizeShowNotes } from "@/lib/episodes/sanitize";
import type { Episode } from "@/lib/episodes/types";

const base: Episode = {
  id: "wp-1",
  slug: "episode-36-jacquie-capur",
  title: "Episode 36: Jacquie Capur",
  description: "A chat about DevRel.",
  showNotesHtml: "<p>Notes with a <a href=\"https://example.com\">link</a>.</p>",
  publishedAt: "2026-10-14T16:57:00.000Z",
  season: 2,
  number: 36,
  type: "full",
  explicit: false,
  durationSeconds: 2608,
  audio: { url: "https://communitycode.dev/a.mp3", contentType: "audio/mpeg", sizeBytes: 1 },
  artworkUrl: "https://communitycode.dev/art.png",
  guests: [{ name: "Jacquie Capur", role: "Guest", photoUrl: null }],
  transcript: { url: "https://communitycode.dev/t.vtt", type: "text/vtt" },
  links: { youtube: "https://youtu.be/x" },
  origin: "wordpress",
};

const html = (e: Episode) => renderToStaticMarkup(<EpisodeDetail episode={e} />);

function jsonLdOf(markup: string): { raw: string; data: Record<string, unknown> } {
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(markup);
  expect(m).not.toBeNull();
  return { raw: m![1], data: JSON.parse(m![1]) };
}

describe("EpisodeDetail", () => {
  it("renders title, label, date, duration, guests, player and notes inside .cc-root", () => {
    const out = html(base);
    // React hoists the artwork <link rel=preload> ahead of the wrapper.
    expect(out).toContain('<div class="cc-root">');
    expect(out).toContain("<h1");
    expect(out).toContain("Episode 36: Jacquie Capur</h1>");
    expect(out).toContain("S2 E36");
    expect(out).toContain("October 14, 2026");
    expect(out).toContain("43:28");
    expect(out).toContain("Jacquie Capur");
    expect(out).toContain('aria-label="Audio player: Episode 36: Jacquie Capur"');
    expect(out).toContain('class="cc-prose"');
    expect(out).toContain('<a href="https://example.com"');
    expect(out).toContain("Transcript</h2>");
    expect(out).toContain("<header"); // site chrome
    expect(out).toContain("<footer");
  });

  it("omits sections it has no data for", () => {
    const out = html({ ...base, audio: null, showNotesHtml: null, transcript: null, guests: [], artworkUrl: null });
    expect(out).toContain("no audio for this episode yet");
    expect(out).not.toContain("cc-prose");
    expect(out).not.toContain("Transcript</h2>");
    expect(out).not.toContain("<img");
  });

  it("emits PodcastEpisode JSON-LD with its series", () => {
    const { data } = jsonLdOf(html(base));
    expect(data["@type"]).toBe("PodcastEpisode");
    expect(data.name).toBe("Episode 36: Jacquie Capur");
    expect(data.episodeNumber).toBe(36);
    expect(data.timeRequired).toBe("PT43M28S");
    expect(data.url).toBe(site.url ? episodeCanonicalUrl(base) : undefined);
    expect(data.partOfSeries).toMatchObject({ "@type": "PodcastSeries", name: site.name });
    expect(data.partOfSeason).toMatchObject({ "@type": "PodcastSeason", seasonNumber: 2 });
  });

  it("cannot be broken out of the JSON-LD script by a hostile title", () => {
    const evil = { ...base, title: '</script><script>window.__pwned=1</script><img src=x onerror=alert(1)>', description: "</SCRIPT>\u2028x" };
    const out = html(evil);
    const { raw, data } = jsonLdOf(out);
    expect(raw).not.toContain("<");
    expect(raw).not.toContain("\u2028");
    expect(data.name).toBe(evil.title); // round-trips intact
    // Exactly one executable-looking script block: the JSON-LD one.
    expect(out.match(/<script/gi)).toHaveLength(1);
    expect(out).not.toContain("<img src=x");
    expect(out).toContain("&lt;/script&gt;"); // h1 escaped by React
  });

  it("renders sanitised show notes without script, handlers or javascript: URLs", () => {
    const dirty =
      '<p onclick="x()">hi</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><img src=x onerror=alert(1)><iframe src="https://evil.example/"></iframe>';
    const out = html({ ...base, showNotesHtml: sanitizeShowNotes(dirty) });
    const notes = out.slice(out.indexOf('class="cc-prose"'));
    expect(notes).toContain("<p>hi</p>");
    expect(notes).not.toMatch(/<script|onclick|onerror|javascript:|evil\.example/i);
  });

  it("escapes hostile guest names and descriptions", () => {
    const out = html({ ...base, guests: [{ name: "<img src=x onerror=alert(1)>", role: null, photoUrl: null }], description: "<b>x</b>" });
    expect(out).not.toContain("<img src=x");
    expect(out).not.toContain("<b>x</b>");
  });
});

describe("helpers", () => {
  it("safeJsonLd escapes < and line separators but stays valid JSON", () => {
    const s = safeJsonLd({ a: "</script>\u2028\u2029" });
    expect(s).not.toMatch(new RegExp("[<\\u2028\\u2029]"));
    expect(JSON.parse(s).a).toBe("</script>\u2028\u2029");
  });

  it("omits undefined JSON-LD properties", () => {
    const ld = buildEpisodeJsonLd({ ...base, audio: null, season: null, number: null, durationSeconds: null, guests: [] });
    expect(JSON.parse(JSON.stringify(ld))).not.toHaveProperty("associatedMedia");
    expect(JSON.parse(JSON.stringify(ld))).not.toHaveProperty("timeRequired");
    expect(JSON.parse(JSON.stringify(ld))).not.toHaveProperty("actor");
  });

  it("meta description is trimmed to 160 chars", () => {
    expect(episodeMetaDescription({ title: "t", description: "word ".repeat(100) }).length).toBeLessThanOrEqual(160);
    expect(episodeMetaDescription({ title: "Fallback", description: "" })).toBe("Fallback");
  });

  it("canonical URL is on this site and encodes the slug", () => {
    expect(episodeCanonicalUrl({ slug: "a b" })).toMatch(/\/episodes\/a%20b$/);
  });

  it("uses NEXT_PUBLIC_SITE_URL for absolute canonical and JSON-LD URLs when set", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pod.example.test/");
    vi.stubEnv("NEXT_PUBLIC_SITE_NAME", "Example Show");
    const mod = await import("@/components/podcast/episode-detail");
    expect(mod.episodeCanonicalUrl(base)).toBe("https://pod.example.test/episodes/episode-36-jacquie-capur");
    const ld = mod.buildEpisodeJsonLd(base) as { url: string; partOfSeries: { name: string; url: string } };
    expect(ld.url).toBe("https://pod.example.test/episodes/episode-36-jacquie-capur");
    expect(ld.partOfSeries).toMatchObject({ name: "Example Show", url: "https://pod.example.test/" });
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
