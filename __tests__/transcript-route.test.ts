import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { Episode } from "@/lib/episodes/types";

const bySlug = vi.fn();
vi.mock("@/lib/episodes", () => ({ getEpisodeSource: () => ({ bySlug }) }));

// Config is driven through loadConfig(env), not by mutating process.env.
let testEnv: Record<string, string | undefined> = {};
vi.mock("@/lib/config", async (orig) => {
  const real = await orig<typeof import("@/lib/config")>();
  return { ...real, getConfig: () => real.loadConfig(testEnv) };
});

import { MAX_TRANSCRIPT_BYTES } from "@/lib/transcript";
import { GET } from "../app/api/episodes/[slug]/transcript/route";

const VTT = "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello <b>there</b>\n\n00:00:02.000 --> 00:00:04.000\nSecond\n";
const SECRET = "super-secret-bypass-token";
const WP = "https://wp.example.test";
const CONFIGURED = {
  WP_BASE_URL: WP,
  PANTHEON_BOT_BYPASS_TOKEN: SECRET,
  TRANSCRIPT_ALLOWED_HOSTS: "media.example.test",
};

function episode(url: string | null, type = "text/vtt"): Episode {
  return { slug: "ep", transcript: url ? { url, type } : null } as Episode;
}

const call = (slug = "ep") => GET({} as NextRequest, { params: Promise.resolve({ slug }) });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  testEnv = { ...CONFIGURED };
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  bySlug.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/episodes/[slug]/transcript", () => {
  it("returns parsed cues with a Cache-Control header", async () => {
    bySlug.mockResolvedValue(episode("https://wp.example.test/app/uploads/x.vtt"));
    fetchMock.mockResolvedValue(new Response(VTT, { status: 200 }));
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/s-maxage=\d+/);
    expect(await res.json()).toEqual({
      cues: [
        { start: 0, end: 2, text: "Hello there" },
        { start: 2, end: 4, text: "Second" },
      ],
    });
  });

  it("sends the Pantheon bypass header to the WordPress host", async () => {
    bySlug.mockResolvedValue(episode("https://wp.example.test/x.vtt"));
    fetchMock.mockResolvedValue(new Response(VTT));
    await call();
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["x-pantheon-bot-bypass"]).toBe(SECRET);
  });

  it("never sends the bypass token to another allowed host", async () => {
    bySlug.mockResolvedValue(episode("https://media.example.test/t.vtt"));
    fetchMock.mockResolvedValue(new Response(VTT));
    const res = await call();
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain("x-pantheon-bot-bypass");
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).not.toContain(SECRET);
  });

  it("400s on an invalid slug without touching the source", async () => {
    const res = await call("../etc/passwd");
    expect(res.status).toBe(400);
    expect(bySlug).not.toHaveBeenCalled();
  });

  it("resolves a relative transcript URL against WP_BASE_URL", async () => {
    bySlug.mockResolvedValue(episode("/app/uploads/rel.vtt"));
    fetchMock.mockResolvedValue(new Response(VTT));
    expect((await call()).status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${WP}/app/uploads/rel.vtt`);
  });

  it("501s with a clear message when no transcript host is configured", async () => {
    testEnv = {};
    bySlug.mockResolvedValue(episode(WP + "/x.vtt"));
    const res = await call();
    expect(res.status).toBe(501);
    expect((await res.json()).error).toMatch(/WP_BASE_URL/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bySlug).not.toHaveBeenCalled();
  });

  it("serves an allowed extra host even when WordPress itself is not configured", async () => {
    testEnv = { TRANSCRIPT_ALLOWED_HOSTS: "media.example.test" };
    bySlug.mockResolvedValue(episode("https://media.example.test/t.vtt"));
    fetchMock.mockResolvedValue(new Response(VTT));
    expect((await call()).status).toBe(200);
  });

  it("404s when the episode does not exist", async () => {
    bySlug.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404s when the episode has no transcript", async () => {
    bySlug.mockResolvedValue(episode(null));
    expect((await call()).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "http://169.254.169.254/latest/meta-data/",
    "https://evil.example/t.vtt",
    "https://wp.example.test.evil.example/t.vtt",
    "http://wp.example.test/t.vtt",
    "https://cdn.show.fm/t.vtt", // not hard-coded: only configured hosts are allowed
    "file:///etc/passwd",
  ])("refuses to fetch %s", async (url) => {
    bySlug.mockResolvedValue(episode(url));
    const res = await call();
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("502s on an upstream error without leaking the URL or token", async () => {
    bySlug.mockResolvedValue(episode(WP + "/app/uploads/secret-path.vtt"));
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
    const res = await call();
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("secret-path");
    expect(text).not.toContain("wp.example.test");
    expect(text).not.toContain(SECRET);
  });

  it("502s on a Pantheon bot challenge", async () => {
    bySlug.mockResolvedValue(episode("https://wp.example.test/x.vtt"));
    fetchMock.mockResolvedValue(new Response("challenge", { status: 403, headers: { "cf-mitigated": "challenge" } }));
    const res = await call();
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("PANTHEON_BOT_BYPASS_TOKEN");
  });

  it("502s when the network fails", async () => {
    bySlug.mockResolvedValue(episode("https://wp.example.test/x.vtt"));
    fetchMock.mockRejectedValue(new TypeError("fetch failed: connect ECONNREFUSED 10.0.0.1"));
    const res = await call();
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("10.0.0.1");
  });

  it("502s when the episode source throws", async () => {
    bySlug.mockRejectedValue(new Error("show.fm down"));
    expect((await call()).status).toBe(502);
  });

  it("rejects an oversized declared Content-Length without reading the body", async () => {
    bySlug.mockResolvedValue(episode("https://wp.example.test/x.vtt"));
    fetchMock.mockResolvedValue(
      new Response(VTT, { headers: { "content-length": String(MAX_TRANSCRIPT_BYTES + 1) } }),
    );
    expect((await call()).status).toBe(502);
  });

  it("caps a streamed body that lies about (or omits) Content-Length", async () => {
    bySlug.mockResolvedValue(episode("https://wp.example.test/x.vtt"));
    let pulled = 0;
    const chunk = new Uint8Array(256 * 1024).fill(97);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    fetchMock.mockResolvedValue(new Response(stream));
    const res = await call();
    expect(res.status).toBe(502);
    // Stopped shortly after the cap rather than draining an endless stream.
    expect(pulled).toBeLessThan(MAX_TRANSCRIPT_BYTES + 2 * 1024 * 1024);
  });

  it("accepts a body just under the cap", async () => {
    bySlug.mockResolvedValue(episode("https://wp.example.test/x.vtt"));
    const filler = "x".repeat(MAX_TRANSCRIPT_BYTES - 1000);
    fetchMock.mockResolvedValue(new Response(`${VTT}\nNOTE ${filler}\n`));
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).cues).toHaveLength(2);
  });

  it("refuses a body from a final URL outside the allow-list (redirect)", async () => {
    bySlug.mockResolvedValue(episode("https://wp.example.test/x.vtt"));
    const upstream = new Response(VTT);
    Object.defineProperty(upstream, "url", { value: "https://evil.example/redirected.vtt" });
    fetchMock.mockResolvedValue(upstream);
    expect((await call()).status).toBe(502);
  });

  it("returns an empty cue list (not an error) for a non-VTT 200 body", async () => {
    bySlug.mockResolvedValue(episode("https://wp.example.test/x.vtt"));
    fetchMock.mockResolvedValue(new Response("<html>Just a moment</html>"));
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cues: [] });
  });
});
