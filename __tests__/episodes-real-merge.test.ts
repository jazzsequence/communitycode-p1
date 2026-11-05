import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleanDescription } from "@/lib/episodes/sanitize";
import { mapEpisode } from "@/lib/episodes/showfm";
import { mergeEpisodes } from "@/lib/episodes";
import { buildEpisodes, parseFeed, type RestEpisode } from "@/lib/episodes/wordpress-parse";
import type { Episode } from "@/lib/episodes/types";

const read = (p: string) => readFileSync(new URL(`../lib/episodes/fixtures/${p}`, import.meta.url), "utf8");

// Real snapshots, both taken after the back catalogue was imported into show.fm.
const wp = buildEpisodes(parseFeed(read("feed.xml")), JSON.parse(read("rest.json")) as RestEpisode[]);
const showfm = (JSON.parse(read("showfm-episodes.json")) as { data: Parameters<typeof mapEpisode>[0][] }).data.map(
  (w) => mapEpisode(w),
);
const merged = mergeEpisodes(showfm, wp);

describe("merging the real show.fm import with the real WordPress archive", () => {
  it("has 38 on each side and merges to exactly 38, with no duplicates", () => {
    expect(showfm).toHaveLength(38);
    expect(wp).toHaveLength(38);
    expect(merged).toHaveLength(38);
    expect(new Set(merged.map((e) => e.slug)).size).toBe(38);
    expect(new Set(merged.map((e) => e.title)).size).toBe(38);
  });

  it("pairs every episode: all come out as show.fm-origin", () => {
    expect(merged.filter((e) => e.origin !== "showfm")).toEqual([]);
  });

  it("keeps the WordPress slug, never show.fm's random-suffixed one", () => {
    const wpSlugs = new Set(wp.map((e) => e.slug));
    expect(merged.every((e) => wpSlugs.has(e.slug))).toBe(true);
    expect(merged.some((e) => /-[a-z0-9]{6}$/.test(e.slug) && !wpSlugs.has(e.slug))).toBe(false);
  });

  it("handles the episodes season+number cannot tell apart (two WordPress episodes are S1 E7)", () => {
    const e7 = merged.find((e) => e.title === "Episode 7: Queen Carolyn of Ladonia");
    const e4 = merged.find((e) => e.title === "Episode 4: Patrick Rauland");
    expect(e7?.slug).toBe("episode-7-queen-carolyn-of-ladonia");
    expect(e4?.slug).toBe("episode-4-patrick-rauland");
    expect(e7?.id).not.toBe(e4?.id);
  });

  it("pairs the episodes show.fm has no season/number for", () => {
    for (const title of ["Episode 32: Bud Kraus", "Episode 0: Community + Code", "Community + Code announcement"]) {
      const e = merged.find((x) => x.title === title);
      expect(e?.origin, title).toBe("showfm");
    }
  });

  it("serves audio and transcripts from show.fm's CDN once hosted there", () => {
    const e36 = merged.find((e) => e.number === 36);
    expect(e36?.audio?.url).toMatch(/^https:\/\/m\.cdn\.media\//);
    expect(e36?.transcript?.url).toMatch(/^https:\/\/m\.cdn\.media\/.*\.vtt$/);
  });

  it("uses WordPress for the description: show.fm's import is the flattened link list", () => {
    const sf36 = showfm.find((e) => e.number === 36);
    const e36 = merged.find((e) => e.number === 36);
    expect(sf36?.description).toMatch(/^Jacquie on Sessionize/);
    expect(e36?.description).toMatch(/^Jacquie Capur went from music major/);
  });

  it("never shows the WordPress 'appeared first on' footer in any description", () => {
    expect(merged.filter((e) => /appeared first on/i.test(e.description))).toEqual([]);
    expect(showfm.filter((e) => /appeared first on/i.test(e.description))).toEqual([]);
  });

  it("falls back to guests parsed from WordPress titles (show.fm's public people are empty)", () => {
    expect(showfm.every((e) => e.guests.length === 0)).toBe(true);
    expect(merged.find((e) => e.number === 36)?.guests.map((g) => g.name)).toEqual(["Jacquie Capur"]);
  });

  it("keeps WordPress show notes, since show.fm's imported notes are empty", () => {
    expect(merged.find((e) => e.number === 36)?.showNotesHtml).toContain("Jacquie on Sessionize");
  });

  it("is newest first", () => {
    const d = merged.map((e) => e.publishedAt);
    expect(d).toEqual([...d].sort().reverse());
  });
});

describe("pairing rules", () => {
  const ep = (o: Partial<Episode>): Episode => ({ ...wp[0], ...o });

  it("matches a retitled WordPress episode by season+number", () => {
    const sf = ep({ id: "sf", title: "Old title", season: 2, number: 9, slug: "old-title-abc123", origin: "showfm" });
    const w = ep({ id: "wp", title: "New title", season: 2, number: 9, slug: "new-title", origin: "wordpress" });
    expect(mergeEpisodes([sf], [w])).toHaveLength(1);
  });

  it("does NOT pair on an ambiguous season+number", () => {
    const sf = ep({ id: "sf", title: "Unique", season: 1, number: 7, slug: "unique-abc123", origin: "showfm" });
    const a = ep({ id: "a", title: "A", season: 1, number: 7, slug: "a", origin: "wordpress" });
    const b = ep({ id: "b", title: "B", season: 1, number: 7, slug: "b", origin: "wordpress" });
    expect(mergeEpisodes([sf], [a, b])).toHaveLength(3);
  });

  it("matches on title alone when numbers and slugs disagree (and ignores punctuation/case)", () => {
    const sf = ep({ id: "sf", title: "Episode 5 \u2013 Ada  Lovelace", season: 9, number: 99, slug: "x-aaaaaa", origin: "showfm" });
    const w = ep({ id: "wp", title: "episode 5: ada lovelace", season: 1, number: 5, slug: "totally-different", origin: "wordpress" });
    expect(mergeEpisodes([sf], [w])).toHaveLength(1);
  });

  it("falls back to the slug with show.fm's suffix stripped", () => {
    const sf = ep({ id: "sf", title: "Renamed", season: null, number: null, slug: "my-episode-a98awc", origin: "showfm" });
    const w = ep({ id: "wp", title: "Another title", season: null, number: null, slug: "my-episode", origin: "wordpress" });
    expect(mergeEpisodes([sf], [w])).toHaveLength(1);
  });

  it("uses each WordPress episode at most once", () => {
    const w = ep({ id: "wp", title: "Same", slug: "same", origin: "wordpress" });
    const a = ep({ id: "a", title: "Same", slug: "same-aaaaaa", origin: "showfm" });
    const b = ep({ id: "b", title: "Same", slug: "same-bbbbbb", origin: "showfm" });
    expect(mergeEpisodes([a, b], [w])).toHaveLength(2);
  });

  it("keeps episodes that exist on only one side", () => {
    const sf = ep({ id: "sf", title: "Only show.fm", season: 3, number: 1, slug: "only-sf-abcdef", origin: "showfm" });
    const w = ep({ id: "wp", title: "Only WP", season: 1, number: 1, slug: "only-wp", origin: "wordpress" });
    expect(mergeEpisodes([sf], [w]).map((e) => e.id).sort()).toEqual(["sf", "wp"]);
  });
});

describe("cleanDescription", () => {
  it("strips the WordPress footer", () => {
    expect(cleanDescription("Hello world. The post Foo appeared first on Bar.")).toBe("Hello world.");
    expect(cleanDescription("We interrupt… The post A + B announcement appeared first on A + B.")).toBe("We interrupt…");
  });
  it("leaves ordinary text and null alone", () => {
    expect(cleanDescription("The post office is closed.")).toBe("The post office is closed.");
    expect(cleanDescription(null)).toBe("");
  });
});
