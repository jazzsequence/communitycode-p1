import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_HOST_ROLES, aggregateGuests, excludeRoles, initialsOf } from "@/lib/guests";
import { buildEpisodes, parseFeed, type RestEpisode } from "@/lib/episodes/wordpress-parse";
import type { Episode, Guest } from "@/lib/episodes/types";

// Real snapshots of communitycode.dev (38 episodes).
const feedXml = readFileSync(new URL("../lib/episodes/fixtures/feed.xml", import.meta.url), "utf8");
const rest = JSON.parse(readFileSync(new URL("../lib/episodes/fixtures/rest.json", import.meta.url), "utf8")) as RestEpisode[];
const real = buildEpisodes(parseFeed(feedXml), rest);

function ep(slug: string, publishedAt: string, guests: Guest[], extra: Partial<Episode> = {}): Episode {
  return {
    id: slug,
    slug,
    title: `Title ${slug}`,
    description: "",
    showNotesHtml: null,
    publishedAt,
    season: 1,
    number: 1,
    type: "full",
    explicit: false,
    durationSeconds: null,
    audio: null,
    artworkUrl: null,
    guests,
    transcript: null,
    links: {},
    origin: "wordpress",
    ...extra,
  };
}
const g = (name: string, extra: Partial<Guest> = {}): Guest => ({ name, role: "Guest", photoUrl: null, ...extra });

describe("aggregateGuests (real fixture)", () => {
  const guests = aggregateGuests(real);
  const names = guests.map((x) => x.name);

  it("includes real guests with their episode", () => {
    const jacquie = guests.find((x) => x.name === "Jacquie Capur");
    expect(jacquie?.episodes).toEqual([
      { slug: "episode-36-jacquie-capur", title: "Episode 36: Jacquie Capur", season: 2, number: 36 },
    ]);
    expect(names).toContain("PJ Hagerty");
  });

  it("does not turn non-guest items into guests", () => {
    expect(names).not.toContain("Community + Code");
    expect(names.some((n) => /^community\s*\+\s*code$/i.test(n))).toBe(false);
    // The two non-episode items in the feed ("Community + Code announcement" and "Episode 0")
    // contribute nothing: 38 items, 36 with a guest.
    expect(real).toHaveLength(38);
    expect(real.filter((e) => !e.guests.length).map((e) => e.title)).toEqual([
      "Community + Code announcement",
      "Episode 0: Community + Code",
    ]);
    expect(guests).toHaveLength(36);
    for (const x of guests) expect(x.episodes.length).toBeGreaterThan(0);
  });

  it("is ordered by most recent appearance (Jacquie, the newest episode, first)", () => {
    expect(names[0]).toBe("Jacquie Capur");
    expect(names[1]).toBe("PJ Hagerty");
  });

  it("every episode with a guest is represented", () => {
    const slugs = new Set(guests.flatMap((x) => x.episodes.map((e) => e.slug)));
    for (const ev of real.filter((x) => x.guests.length)) expect(slugs.has(ev.slug)).toBe(true);
  });
});

describe("aggregateGuests (rules)", () => {
  it("dedupes case- and whitespace-insensitively; a repeat guest has two episodes, newest first", () => {
    const out = aggregateGuests([
      ep("old", "2025-01-01T00:00:00Z", [g("jane   doe")]),
      ep("new", "2026-01-01T00:00:00Z", [g("Jane Doe")]),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Jane Doe"); // from the most recent appearance
    expect(out[0].episodes.map((e) => e.slug)).toEqual(["new", "old"]);
  });

  it("is independent of input order", () => {
    const a = ep("a", "2025-01-01T00:00:00Z", [g("A")]);
    const b = ep("b", "2026-01-01T00:00:00Z", [g("B")]);
    expect(aggregateGuests([a, b]).map((x) => x.name)).toEqual(["B", "A"]);
    expect(aggregateGuests([b, a]).map((x) => x.name)).toEqual(["B", "A"]);
  });

  it("breaks ties on the same episode by name", () => {
    const out = aggregateGuests([ep("x", "2026-01-01T00:00:00Z", [g("Zed"), g("Amy")])]);
    expect(out.map((x) => x.name)).toEqual(["Amy", "Zed"]);
  });

  it("lists an episode once if the same guest is credited twice on it", () => {
    const out = aggregateGuests([ep("x", "2026-01-01T00:00:00Z", [g("Amy"), g("AMY")])]);
    expect(out[0].episodes).toHaveLength(1);
  });

  it("fills photo and role from any appearance, preferring the newest, and drops unsafe photo URLs", () => {
    const out = aggregateGuests([
      ep("old", "2025-01-01T00:00:00Z", [g("Amy", { photoUrl: "https://x.test/old.jpg" })]),
      ep("new", "2026-01-01T00:00:00Z", [g("Amy", { photoUrl: "javascript:alert(1)", role: null })]),
    ]);
    expect(out[0].photoUrl).toBe("https://x.test/old.jpg");
    expect(out[0].role).toBe("Guest");
  });

  it("keeps roles as-is (hiding hosts is a block field) and drops empty names", () => {
    const out = aggregateGuests([
      ep("x", "2026-01-01T00:00:00Z", [g("Pat", { role: "Co-host" }), g("  "), g("Amy")]),
    ]);
    expect(out.map((x) => [x.name, x.role])).toEqual([["Amy", "Guest"], ["Pat", "Co-host"]]);
  });

  it("returns [] for no episodes", () => {
    expect(aggregateGuests([])).toEqual([]);
  });
});

describe("excludeRoles", () => {
  const people = [
    { name: "H", role: "Host" },
    { name: "C", role: "Co-host" },
    { name: "G", role: "Guest" },
    { name: "N", role: null },
  ];
  const names = (p: string | undefined) => excludeRoles(people, p).map((x) => x.name);

  it("defaults to host|co-host, case-insensitively", () => {
    expect(DEFAULT_HOST_ROLES).toBe("host|co-host");
    expect(names(undefined)).toEqual(["G", "N"]);
    expect(names("HOST")).toEqual(["G", "N"]); // unanchored: also matches "Co-host"
  });
  it("uses a custom pattern", () => {
    expect(names("^guest$")).toEqual(["H", "C", "N"]);
  });
  it("empty pattern hides nobody", () => {
    expect(names("  ")).toEqual(["H", "C", "G", "N"]);
  });
  it("invalid or oversized patterns fall back to the default instead of throwing", () => {
    expect(names("(")).toEqual(["G", "N"]);
    expect(names("a".repeat(101))).toEqual(["G", "N"]);
  });
});

describe("initialsOf", () => {
  it("handles one, two, many words, unicode and junk", () => {
    expect(initialsOf("Jacquie Capur")).toBe("JC");
    expect(initialsOf("Cher")).toBe("C");
    expect(initialsOf("Mary Jane Watson")).toBe("MW");
    expect(initialsOf("édith piaf")).toBe("ÉP");
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("!!! ???")).toBe("?");
  });
});

describe("GET /api/guests", () => {
  const all = vi.fn();
  beforeEach(() => {
    all.mockReset();
    vi.resetModules();
    vi.doMock("@/lib/episodes", () => ({ getEpisodeSource: () => ({ all }) }));
  });

  it("returns aggregated guests with cache headers", async () => {
    all.mockResolvedValue(real);
    const { GET } = await import("@/app/api/guests/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=60, stale-while-revalidate=300");
    const body = (await res.json()) as { guests: { name: string; photoUrl: string | null; role: string | null; episodes: unknown[] }[] };
    expect(body.guests.find((x) => x.name === "Jacquie Capur")).toMatchObject({
      name: "Jacquie Capur",
      photoUrl: null,
      role: "Guest",
      episodes: [{ slug: "episode-36-jacquie-capur", title: "Episode 36: Jacquie Capur", season: 2, number: 36 }],
    });
  });

  it("returns 501 (not 502) when no episode source is configured", async () => {
    vi.resetModules();
    // Import after the reset so the route and this test share one ConfigError class.
    const { ConfigError } = await import("@/lib/config");
    vi.doMock("@/lib/episodes", () => ({
      getEpisodeSource: () => {
        throw new ConfigError("No episode source configured for EPISODE_SOURCE=auto");
      },
    }));
    const { GET } = await import("@/app/api/guests/route");
    const res = await GET();
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "No episode source configured." });
  });

  it("returns a safe 502 without leaking the upstream error", async () => {
    all.mockRejectedValue(new Error("secret upstream detail https://x?token=abc"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/guests/route");
    const res = await GET();
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toBe(JSON.stringify({ error: "Guests are temporarily unavailable." }));
    expect(text).not.toMatch(/secret|token/);
    expect(res.headers.get("Cache-Control")).toBeNull();
    err.mockRestore();
  });
});
