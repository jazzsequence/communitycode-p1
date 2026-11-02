import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/posts/route";
import fixture from "@/lib/fixtures/posts.json";

const TOKEN = "super-secret-bypass-token";

// WordPress config comes from getConfig(); control it per test.
const wp = vi.hoisted(() => ({ value: null as null | { baseUrl: string; feedPath: string; bypassToken?: string } }));
vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config")>()),
  getConfig: () => ({ wordpress: wp.value, showfm: null, transcriptHosts: [] }),
}));

function call(qs = "") {
  return GET(new NextRequest(`http://localhost/api/posts${qs}`));
}

beforeEach(() => {
  wp.value = { baseUrl: "https://wp.example.com", feedPath: "/feed/", bypassToken: TOKEN };
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/posts", () => {
  it("returns mapped posts, paging info and cache headers", async () => {
    const fetchMock = vi.fn(async () => Response.json(fixture, { headers: { "X-WP-TotalPages": "4" } }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await call("?page=2&per_page=10&q=ai");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=60, stale-while-revalidate=300");
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.totalPages).toBe(4);
    expect(body.posts).toHaveLength(10);
    expect(body.posts[0]).toMatchObject({ id: 1243, imageUrl: expect.stringContaining("768x432") });

    const url = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("search")).toBe("ai");
  });

  it.each([
    ["page=0"],
    ["page=abc"],
    ["per_page=0"],
    ["per_page=25"],
    [`q=${"x".repeat(101)}`],
  ])("400s on %s without calling WordPress", async (qs) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await call(`?${qs}`);
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("502s with a safe message when WordPress fails, leaking no URL or token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const res = await call();
    expect(res.status).toBe(502);
    const text = JSON.stringify(await res.json());
    expect(text).toBe(JSON.stringify({ error: "Posts are temporarily unavailable." }));
    expect(text).not.toContain("example.com");
    expect(text).not.toContain(TOKEN);
  });

  it("501s with \"Blog isn't configured.\" when WordPress is not configured (not a 502)", async () => {
    wp.value = null;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await call("?per_page=3");
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "Blog isn't configured." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still validates params first when unconfigured", async () => {
    wp.value = null;
    expect((await call("?page=0")).status).toBe(400);
  });

  it("sends the configured WordPress host and bypass header upstream", async () => {
    const fetchMock = vi.fn(async () => Response.json(fixture));
    vi.stubGlobal("fetch", fetchMock);
    await call();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith("https://wp.example.com/wp-json/wp/v2/posts?")).toBe(true);
    expect((init.headers as Record<string, string>)["x-pantheon-bot-bypass"]).toBe(TOKEN);
  });

  it("502s on a network failure and a bot challenge", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error(`connect ECONNREFUSED ${TOKEN}`); }));
    const net = await call();
    expect(net.status).toBe(502);
    expect(JSON.stringify(await net.json())).not.toContain(TOKEN);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 403, headers: { "cf-mitigated": "challenge" } })),
    );
    expect((await call()).status).toBe(502);
  });
});
