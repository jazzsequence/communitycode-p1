import { describe, expect, it } from "vitest";
import { buildEpisodesUrl, episodesReducer, initialEpisodesState, type EpisodesState } from "@/components/podcast/use-episodes";
import type { EpisodeCard, EpisodeListResponse } from "@/lib/episodes/dto";

const ep = (id: string): EpisodeCard => ({ id }) as EpisodeCard;
const page = (ids: string[], nextCursor: string | null, seasons?: number[]): EpisodeListResponse => ({
  episodes: ids.map(ep),
  nextCursor,
  origin: "wordpress",
  ...(seasons ? { seasons } : {}),
});

describe("buildEpisodesUrl", () => {
  it("omits season/type/cursor when unset", () => {
    expect(buildEpisodesUrl({ endpoint: "/api/episodes", limit: 12 })).toBe("/api/episodes?limit=12");
  });
  it("includes every filter and passes the cursor through unchanged", () => {
    const cursor = "b2Zmc2V0Oj/EyIA==&x";
    const url = new URL(buildEpisodesUrl({ endpoint: "/api/episodes", limit: 6, season: 2, types: ["full", "bonus"] }, cursor), "http://x");
    expect(url.pathname).toBe("/api/episodes");
    expect(url.searchParams.get("limit")).toBe("6");
    expect(url.searchParams.get("season")).toBe("2");
    expect(url.searchParams.get("type")).toBe("full,bonus");
    expect(url.searchParams.get("cursor")).toBe(cursor);
  });
  it("appends with & when the endpoint already has a query, and with ? otherwise", () => {
    expect(buildEpisodesUrl({ endpoint: "/feeds/eps?x=1", limit: 6 })).toBe("/feeds/eps?x=1&limit=6");
    expect(buildEpisodesUrl({ endpoint: "https://api.example.test/list", limit: 6 })).toBe("https://api.example.test/list?limit=6");
  });
  it("keeps season 0 (falsy but valid)", () => {
    expect(buildEpisodesUrl({ endpoint: "/api/episodes", limit: 6, season: 0 })).toContain("season=0");
  });
});

describe("episodesReducer", () => {
  const loaded: EpisodesState = { ...initialEpisodesState, status: "ready", episodes: [ep("a")], nextCursor: "c1", seasons: [2, 1] };

  it("reset clears list and cursor but keeps seasons", () => {
    const s = episodesReducer(loaded, { type: "reset" });
    expect(s).toMatchObject({ status: "loading", episodes: [], nextCursor: null, seasons: [2, 1] });
  });
  it("appends a later page and keeps seasons when the page has none", () => {
    const s = episodesReducer(loaded, { type: "page", page: page(["b"], null), append: true });
    expect(s.episodes.map((e) => e.id)).toEqual(["a", "b"]);
    expect(s.nextCursor).toBeNull();
    expect(s.seasons).toEqual([2, 1]);
  });
  it("replaces on a first page and takes its seasons", () => {
    const s = episodesReducer(loaded, { type: "page", page: page(["z"], "c9", [3]), append: false });
    expect(s.episodes.map((e) => e.id)).toEqual(["z"]);
    expect(s.seasons).toEqual([3]);
  });
  it("fail keeps the list and cursor so a load-more error is recoverable", () => {
    const s = episodesReducer(loaded, { type: "fail", message: "nope", phase: "more" });
    expect(s).toMatchObject({ status: "error", errorPhase: "more", nextCursor: "c1" });
    expect(s.episodes).toHaveLength(1);
  });
});
