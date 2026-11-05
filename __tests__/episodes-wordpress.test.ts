import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseGuestsFromTitle } from "@/lib/episodes/guest";
import { buildEpisodes, parseDuration, parseFeed, type RestEpisode } from "@/lib/episodes/wordpress-parse";
import { pageOf, seasonsOf } from "@/lib/episodes/filter";

// Real snapshots of communitycode.dev (feed limit 50, 38 episodes).
const feedXml = readFileSync(new URL("../lib/episodes/fixtures/feed.xml", import.meta.url), "utf8");
const rest = JSON.parse(
  readFileSync(new URL("../lib/episodes/fixtures/rest.json", import.meta.url), "utf8"),
) as RestEpisode[];
const episodes = buildEpisodes(parseFeed(feedXml), rest);

describe("WordPress feed + REST join (real fixtures)", () => {
  it("maps every feed item", () => {
    expect(episodes).toHaveLength(38);
  });

  it("is newest first", () => {
    const dates = episodes.map((e) => e.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("every episode has audio and every full episode has a transcript link", () => {
    expect(episodes.every((e) => e.audio?.url.startsWith("https://"))).toBe(true);
    const e36 = episodes.find((e) => e.slug === "episode-36-jacquie-capur");
    expect(e36?.transcript?.type).toBe("text/vtt");
  });

  it("reads season, number, duration and audio from the feed", () => {
    const e36 = episodes.find((e) => e.slug === "episode-36-jacquie-capur");
    expect(e36).toMatchObject({
      id: "wp-1238",
      title: "Episode 36: Jacquie Capur",
      season: 2,
      number: 36,
      type: "full",
      durationSeconds: 43 * 60 + 28,
      origin: "wordpress",
    });
    expect(e36?.audio?.url).toBe("https://communitycode.dev/app/uploads/2026/10/s02e36-jacquie-capur.mp3");
  });

  it("takes show notes and the YouTube link from REST, and the image from the embed", () => {
    const e36 = episodes.find((e) => e.slug === "episode-36-jacquie-capur");
    expect(e36?.links.youtube).toBe("https://youtu.be/-eKwLvIl728");
    expect(e36?.artworkUrl).toMatch(/^https:\/\/communitycode\.dev\//);
    expect(e36?.showNotesHtml).toContain("Jacquie on Sessionize");
  });

  it("strips the WordPress 'appeared first on' footer and unsafe markup", () => {
    for (const e of episodes) {
      expect(e.showNotesHtml ?? "").not.toMatch(/appeared first on/i);
      expect(e.showNotesHtml ?? "").not.toMatch(/<script|onerror=|javascript:/i);
    }
  });

  it("decodes entities in titles", () => {
    expect(episodes.some((e) => /&#\d+;|&amp;/.test(e.title))).toBe(false);
    expect(episodes.find((e) => e.title.startsWith("Episode 29"))?.title).toBe("Episode 29 – Robert Abela");
  });

  it("derives guests from titles, and none for non-episode items", () => {
    expect(episodes.find((e) => e.number === 36)?.guests.map((g) => g.name)).toEqual(["Jacquie Capur"]);
    expect(episodes.find((e) => e.number === 29)?.guests.map((g) => g.name)).toEqual(["Robert Abela"]);
    const noGuest = episodes.filter((e) => e.guests.length === 0).map((e) => e.title);
    expect(noGuest).toContain("Episode 0: Community + Code");
  });

  it("reports seasons newest first", () => {
    const seasons = seasonsOf(episodes);
    expect(seasons).toEqual([...seasons].sort((a, b) => b - a));
    expect(seasons).toContain(2);
  });
});

describe("pagination and filtering", () => {
  it("pages with an opaque cursor and ends with null", () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = pageOf(episodes, { limit: 10, cursor }, "wordpress");
      seen.push(...page.episodes.map((e) => e.id));
      cursor = page.nextCursor;
      pages++;
    } while (cursor && pages < 10);
    expect(pages).toBe(4);
    expect(new Set(seen).size).toBe(38);
  });

  it("filters by season and by free text (title or guest)", () => {
    const s2 = pageOf(episodes, { season: 2, limit: 50 }, "wordpress").episodes;
    expect(s2.length).toBeGreaterThan(0);
    expect(s2.every((e) => e.season === 2)).toBe(true);
    const hit = pageOf(episodes, { query: "jacquie", limit: 50 }, "wordpress").episodes;
    expect(hit.map((e) => e.number)).toContain(36);
  });

  it("treats a garbled cursor as the first page rather than throwing", () => {
    const page = pageOf(episodes, { cursor: "!!not-a-cursor!!", limit: 5 }, "wordpress");
    expect(page.episodes).toHaveLength(5);
  });
});

describe("helpers", () => {
  it("parses durations", () => {
    expect(parseDuration("43:28")).toBe(2608);
    expect(parseDuration("1:02:03")).toBe(3723);
    expect(parseDuration("1:02")).toBe(62);
    expect(parseDuration(undefined)).toBeNull();
    expect(parseDuration("abc")).toBeNull();
  });

  it("parses guest names from title shapes", () => {
    expect(parseGuestsFromTitle("Episode 3: Ada Lovelace & Grace Hopper").map((g) => g.name)).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
    expect(parseGuestsFromTitle("Community + Code announcement")).toEqual([]);
    expect(parseGuestsFromTitle("Episode 0: Community + Code")).toEqual([]);
  });
});
