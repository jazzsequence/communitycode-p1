import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "@/lib/fixtures/posts.json";
import {
  buildPostsUrl,
  loadPosts,
  mapPost,
  mapPosts,
  safeLink,
  parsePostsParams,
  toIsoUtc,
  type RawPost,
} from "@/lib/posts";

// The fixture is a trimmed real response from communitycode.dev
// (per_page=10, _embed=author,wp:featuredmedia).
const raw = fixture as unknown as RawPost[];
const cfg = { baseUrl: "https://wp.example.com", feedPath: "/x", bypassToken: "tok-123" };

afterEach(() => vi.unstubAllGlobals());

describe("mapPost against the real WordPress snapshot", () => {
  const posts = mapPosts(raw);

  it("maps every post", () => {
    expect(posts).toHaveLength(10);
    expect(posts[0]).toEqual({
      id: 1243,
      slug: "jacquie-capur-on-turning-a-fear-of-public-speaking-into-a-career-and-whimsy",
      title: "Jacquie Capur on turning a fear of public speaking into a career and whimsy",
      excerpt:
        "Jacquie Capur on beating stage fright, a CodeTV live-coding show, why DevRel is so hard to measure, and how AI brought the joy back to building things",
      publishedAt: "2026-10-16T17:00:00.000Z",
      link: "https://communitycode.dev/2026/10/jacquie-capur-on-turning-a-fear-of-public-speaking-into-a-career-and-whimsy/",
      imageUrl:
        "https://communitycode.dev/app/uploads/2026/10/communitycode-video-thumb-jacquie-capur-768x432.png",
      authorName: "chris",
    });
  });

  it("decodes entities in titles and excerpts and leaves no markup", () => {
    const bud = posts.find((p) => p.id === 1150);
    expect(bud?.title).toBe("Bud Kraus on bringing the human value AI can’t fake");
    for (const p of posts) {
      expect(p.title).not.toMatch(/&#|&amp;|<[a-z]/i);
      expect(p.excerpt).not.toMatch(/&#|&amp;|<[a-z]/i);
    }
    expect(posts.find((p) => p.id === 1089)?.excerpt).toContain("“website therapist”");
  });

  it("treats date_gmt as UTC even though WordPress omits the offset", () => {
    for (const p of posts) expect(p.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(posts.find((p) => p.id === 1115)?.publishedAt).toBe("2026-07-24T16:58:30.000Z");
  });

  it("prefers the 768px rendition over the 1920px original", () => {
    for (const p of posts) expect(p.imageUrl).toMatch(/-768x432\.png$/);
  });
});

describe("mapPost edge cases", () => {
  const base: RawPost = { id: 1, slug: "a-post", link: "https://wp.example.com/2026/01/a-post/" };

  it("handles a post with no media, excerpt, author or date", () => {
    expect(mapPost(base)).toEqual({
      id: 1,
      slug: "a-post",
      title: "a-post",
      excerpt: "",
      publishedAt: "",
      link: "https://wp.example.com/2026/01/a-post/",
      imageUrl: null,
      authorName: null,
    });
  });

  it("returns null image for a failed embed (an error object, not media)", () => {
    const post = mapPost({
      ...base,
      _embedded: { "wp:featuredmedia": [{ code: "rest_post_invalid_id" } as never] },
    });
    expect(post?.imageUrl).toBeNull();
  });

  it("falls back to large, then source_url", () => {
    const withSizes = (sizes: Record<string, { source_url?: string }>, source_url?: string) =>
      mapPost({ ...base, _embedded: { "wp:featuredmedia": [{ source_url, media_details: { sizes } }] } })?.imageUrl;
    expect(withSizes({ large: { source_url: "https://x.test/l.png" } }, "https://x.test/o.png")).toBe(
      "https://x.test/l.png",
    );
    expect(withSizes({}, "https://x.test/o.png")).toBe("https://x.test/o.png");
    expect(withSizes({ medium_large: { source_url: "javascript:alert(1)" } })).toBeNull();
  });

  it("trusts the post's own link, whatever host it is on", () => {
    expect(mapPost({ ...base, link: "http://other.example.org/p/?x=1" })?.link).toBe("http://other.example.org/p/?x=1");
  });

  it("drops a post whose link is missing or not http(s) rather than emit a bad href", () => {
    expect(safeLink("javascript:alert(1)")).toBeNull();
    expect(safeLink("//evil.example/x")).toBeNull();
    expect(safeLink(undefined)).toBeNull();
    expect(mapPost({ ...base, link: "javascript:alert(1)" })).toBeNull();
    expect(mapPost({ ...base, link: undefined })).toBeNull();
  });

  it("strips WordPress's automatic [hellip] marker", () => {
    const p = mapPost({ ...base, excerpt: { rendered: "<p>Some text [&hellip;]</p>" } });
    expect(p?.excerpt).toBe("Some text…");
  });

  it("drops malformed items and non-arrays", () => {
    expect(mapPosts([{ slug: "no-id" }, { id: 2 }, { id: 3, slug: "no-link" }, base])).toHaveLength(1);
    expect(mapPosts({ code: "rest_error" })).toEqual([]);
  });

  it("toIsoUtc keeps an explicit offset and rejects junk", () => {
    expect(toIsoUtc("2026-10-16T17:00:00+02:00")).toBe("2026-10-16T15:00:00.000Z");
    expect(toIsoUtc("2026-10-16T17:00:00Z")).toBe("2026-10-16T17:00:00.000Z");
    expect(toIsoUtc("not a date")).toBe("");
  });
});

describe("parsePostsParams", () => {
  const parse = (qs: string) => parsePostsParams(new URLSearchParams(qs));

  it("defaults", () => {
    expect(parse("")).toEqual({ ok: true, query: { page: 1, perPage: 9 } });
  });
  it("accepts valid values and trims q", () => {
    expect(parse("page=3&per_page=24&q=%20hello%20")).toEqual({
      ok: true,
      query: { page: 3, perPage: 24, search: "hello" },
    });
  });
  it.each(["page=0", "page=-1", "page=abc", "page=1.5", "page=10000", "per_page=0", "per_page=25", "per_page=x", "per_page=1e1"])(
    "rejects %s",
    (qs) => expect(parse(qs).ok).toBe(false),
  );
  it("rejects q over 100 chars", () => {
    expect(parse(`q=${"a".repeat(101)}`).ok).toBe(false);
    expect(parse(`q=${"a".repeat(100)}`).ok).toBe(true);
  });
});

describe("buildPostsUrl / loadPosts", () => {
  it("lists _links in _fields (otherwise _embed is silently dropped)", () => {
    const url = new URL(buildPostsUrl(cfg, { page: 2, perPage: 5, search: "wp cli", categories: [3, 4] }));
    expect(url.pathname).toBe("/wp-json/wp/v2/posts");
    expect(url.searchParams.get("_fields")?.split(",")).toContain("_links");
    expect(url.searchParams.get("_embed")).toBe("author,wp:featuredmedia");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("per_page")).toBe("5");
    expect(url.searchParams.get("search")).toBe("wp cli");
    expect(url.searchParams.get("categories")).toBe("3,4");
  });

  it("sends the bypass header, reads pagination headers and maps posts", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(raw, { headers: { "X-WP-Total": "39", "X-WP-TotalPages": "4" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await loadPosts({ page: 1, perPage: 10 }, cfg);
    expect(res.page).toBe(1);
    expect(res.totalPages).toBe(4);
    expect(res.posts).toHaveLength(10);
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)["x-pantheon-bot-bypass"]).toBe("tok-123");
  });

  it("treats a page past the end (WP 400) as an empty page, not an outage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 400 })));
    const res = await loadPosts({ page: 9, perPage: 10 }, cfg);
    expect(res).toEqual({ posts: [], page: 9, totalPages: 8 });
  });

  it("surfaces Pantheon's bot challenge as an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 403, headers: { "cf-mitigated": "challenge" } })),
    );
    await expect(loadPosts({ page: 1, perPage: 10 }, cfg)).rejects.toThrow(/bot protection/);
  });

  it("rejects a non-list body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "x" })));
    await expect(loadPosts({ page: 1, perPage: 10 }, cfg)).rejects.toThrow(/not a list/);
  });
});
