import { afterEach, describe, expect, it, vi } from "vitest";
import { composite } from "@/lib/episodes";
import { createShowFmSource, mapEpisode } from "@/lib/episodes/showfm";
import type { Episode, EpisodeSource } from "@/lib/episodes/types";

const wire = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "episode-1",
  title: "Episode 1",
  description: "Pilot",
  season_number: 1,
  episode_number: 1,
  episode_type: "full",
  explicit: false,
  published_at: "2026-01-01T00:00:00Z",
  audio: { url: "https://cdn.show.fm/a.mp3", content_type: "audio/mpeg", duration_seconds: 60, size_bytes: 10 },
  artwork: { url: "https://cdn.show.fm/a.png" },
  links: { listen: "https://show.fm/l", embed: "https://show.fm/e" },
  people: [{ name: "Ada", role: "Guest", photo_url: "https://cdn.show.fm/ada.png" }],
  transcript: { url: "https://cdn.show.fm/t.vtt", type: "text/vtt" },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("show.fm adapter", () => {
  it("maps the public payload, including guests and transcript", () => {
    const e = mapEpisode(wire);
    expect(e).toMatchObject({
      id: wire.id,
      season: 1,
      durationSeconds: 60,
      origin: "showfm",
      transcript: { type: "text/vtt" },
    });
    expect(e.guests).toEqual([{ name: "Ada", role: "Guest", photoUrl: "https://cdn.show.fm/ada.png" }]);
  });

  it("sanitises keyed show notes", () => {
    const e = mapEpisode(wire, '<p>ok</p><script>alert(1)</script>');
    expect(e.showNotesHtml).toBe("<p>ok</p>");
  });

  it("passes cursor, season and type through to the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [wire], pagination: { next_cursor: "abc" } }));
    vi.stubGlobal("fetch", fetchMock);
    const page = await createShowFmSource({ podcastSlug: "communitycode" }).list({
      limit: 5,
      cursor: "c1",
      season: 1,
      type: ["full", "bonus"],
    });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/v1/podcasts/communitycode/episodes");
    expect(Object.fromEntries(url.searchParams)).toEqual({ limit: "5", cursor: "c1", season: "1", type: "full,bonus" });
    expect(page.nextCursor).toBe("abc");
  });

  it("treats a 404 show as empty, not an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: { code: "not_found", message: "x" } }, 404)));
    const src = createShowFmSource({ podcastSlug: "communitycode" });
    expect((await src.list()).episodes).toEqual([]);
    expect(await src.latest()).toBeNull();
    expect(await src.bySlug("nope")).toBeNull();
  });

  it("sends the API key only to keyed endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ data: wire }))
      .mockResolvedValueOnce(json({ data: { show_notes_html: "<p>notes</p>" } }));
    vi.stubGlobal("fetch", fetchMock);
    const e = await createShowFmSource({ podcastSlug: "communitycode", apiKey: "showfm_live_test" }).bySlug("episode-1");
    const [publicCall, keyedCall] = fetchMock.mock.calls as [string, RequestInit][];
    expect((publicCall[1].headers as Record<string, string>).Authorization).toBeUndefined();
    expect((keyedCall[1].headers as Record<string, string>).Authorization).toBe("Bearer showfm_live_test");
    expect(e?.showNotesHtml).toBe("<p>notes</p>");
  });

  it("still returns the episode when the keyed show-notes call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ data: wire }))
        .mockResolvedValueOnce(json({ error: { code: "insufficient_scope", message: "no" } }, 403)),
    );
    const e = await createShowFmSource({ podcastSlug: "communitycode", apiKey: "k" }).bySlug("episode-1");
    expect(e?.title).toBe("Episode 1");
    expect(e?.showNotesHtml).toBeNull();
  });
});

describe("composite source (merge)", () => {
  const mk = (over: Partial<Episode>): Episode => ({ ...mapEpisode(wire), ...over });
  const source = (name: "showfm" | "wordpress", episodes: Episode[], fail = false): EpisodeSource => ({
    name,
    all: async () => {
      if (fail) throw new Error("boom");
      return episodes;
    },
    list: async () => ({ episodes, nextCursor: null, origin: name }),
    latest: async () => episodes[0] ?? null,
    bySlug: async (slug) => episodes.find((e) => e.slug === slug) ?? null,
    seasons: async () => [],
  });

  // WordPress holds the back catalogue; show.fm only has what was created there.
  const wp = [
    mk({ id: "wp-1", slug: "episode-1-ada", season: 1, number: 1, title: "Episode 1: Ada", publishedAt: "2026-01-01T00:00:00Z", origin: "wordpress" }),
    mk({ id: "wp-2", slug: "episode-2-grace", season: 1, number: 2, title: "Episode 2: Grace", publishedAt: "2026-02-01T00:00:00Z", origin: "wordpress" }),
  ];

  it("serves WordPress alone while show.fm is empty, filters and pagination included", async () => {
    const s = composite(source("showfm", []), source("wordpress", wp));
    expect((await s.list({ limit: 1 })).nextCursor).not.toBeNull();
    expect((await s.list({ season: 1 })).episodes).toHaveLength(2);
    expect((await s.list({ query: "grace" })).episodes.map((e) => e.number)).toEqual([2]);
    expect((await s.list()).origin).toBe("wordpress");
  });

  it("walks every page of a WordPress-backed list with one consistent cursor scheme", async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      mk({ id: `wp-${i}`, slug: `e-${i}`, season: 1, number: i + 1, publishedAt: new Date(2026, 0, i + 1).toISOString(), origin: "wordpress" }),
    );
    const s = composite(source("showfm", []), source("wordpress", many));
    let cursor: string | null = null;
    const seen: string[] = [];
    do {
      const page = await s.list({ limit: 12, cursor });
      seen.push(...page.episodes.map((e) => e.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(new Set(seen).size).toBe(30);
  });

  it("adds show.fm-only episodes to the archive", async () => {
    const fresh = mk({ id: "sf-3", slug: "episode-3-new", season: 2, number: 3, title: "Episode 3", publishedAt: "2026-03-01T00:00:00Z" });
    const s = composite(source("showfm", [fresh]), source("wordpress", wp));
    const page = await s.list({ limit: 50 });
    expect(page.episodes.map((e) => e.id)).toEqual(["sf-3", "wp-2", "wp-1"]);
    expect(page.origin).toBe("showfm");
  });

  it("merges an episode present in both: show.fm wins, WordPress fills gaps, WP slug stays", async () => {
    const sf = mk({
      id: "sf-1",
      slug: "episode-1",
      season: 1,
      number: 1,
      audio: null,
      transcript: null,
      showNotesHtml: null,
      guests: [{ name: "Ada Lovelace", role: "Guest", photoUrl: "https://x/ada.png" }],
    });
    const wpFull = mk({
      id: "wp-1",
      slug: "episode-1-ada",
      season: 1,
      number: 1,
      audio: { url: "https://communitycode.dev/a.mp3", contentType: "audio/mpeg", sizeBytes: 1 },
      transcript: { url: "https://communitycode.dev/t.vtt", type: "text/vtt" },
      showNotesHtml: "<p>wp notes</p>",
      origin: "wordpress",
    });
    const [e, ...rest] = await composite(source("showfm", [sf]), source("wordpress", [wpFull])).all();
    expect(rest).toHaveLength(0);
    expect(e).toMatchObject({ id: "sf-1", slug: "episode-1-ada", origin: "showfm", showNotesHtml: "<p>wp notes</p>" });
    expect(e.audio?.url).toBe("https://communitycode.dev/a.mp3");
    expect(e.guests[0].photoUrl).toBe("https://x/ada.png");
  });

  it("survives either source being down", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const noShowfm = composite(source("showfm", [], true), source("wordpress", wp));
    expect((await noShowfm.list()).episodes).toHaveLength(2);
    const noWp = composite(source("showfm", [mk({ slug: "only" })]), source("wordpress", [], true));
    expect((await noWp.list()).episodes).toHaveLength(1);
  });

  it("resolves an episode by WordPress slug and enriches it from show.fm", async () => {
    const enrich = vi.fn(async (e: Episode) => ({ ...e, showNotesHtml: "<p>from show.fm</p>" }));
    const sf = { ...source("showfm", [mk({ id: "sf-1", slug: "x", season: 1, number: 1 })]), enrich };
    const found = await composite(sf, source("wordpress", wp)).bySlug("episode-1-ada");
    expect(found?.showNotesHtml).toBe("<p>from show.fm</p>");
    expect(await composite(sf, source("wordpress", wp)).bySlug("nope")).toBeNull();
  });
});
