// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The header/footer are covered elsewhere; only the post body is under test.
vi.mock("@/components/podcast/chrome", () => ({ SiteHeaderView: () => null, SiteFooterView: () => null }));
vi.mock("server-only", () => ({}));

import { PostDetailView, buildPostJsonLd, postMetaDescription } from "@/components/podcast/post-detail";
import { buildPostBySlugUrl, loadPostBySlug, mapPostDetail, type PostDetail } from "@/lib/posts";

afterEach(cleanup);

const detail = (over: Partial<PostDetail> = {}): PostDetail => ({
  id: 1,
  slug: "a-post",
  title: "A post",
  excerpt: "Short.",
  publishedAt: "2026-10-16T17:00:00.000Z",
  link: "https://wp.example.com/2026/10/a-post/",
  imageUrl: "https://wp.example.com/img.png",
  authorName: "Chris",
  contentHtml: "<p>Hello <a href=\"https://example.com\">world</a></p>",
  ...over,
});

describe("PostDetailView", () => {
  it("renders the post body on this site, with a link back to the blog", () => {
    const { container } = render(<PostDetailView post={detail()} />);
    expect(screen.getByRole("heading", { level: 1, name: "A post" })).toBeTruthy();
    expect(container.querySelector(".cc-prose")?.textContent).toBe("Hello world");
    expect(screen.getByText("By Chris")).toBeTruthy();
    expect(screen.getByRole("link", { name: "All posts" }).getAttribute("href")).toBe("/blog");
    expect(container.querySelector("script[type='application/ld+json']")?.textContent).toContain("BlogPosting");
  });

  it("says so when the post has no body", () => {
    render(<PostDetailView post={detail({ contentHtml: "" })} />);
    expect(screen.getByText(/no content yet/i)).toBeTruthy();
  });

  it("builds a description and JSON-LD from the post", () => {
    expect(postMetaDescription(detail({ excerpt: "x".repeat(300) })).length).toBeLessThanOrEqual(160);
    expect(postMetaDescription(detail({ excerpt: "" }))).toBe("A post");
    expect(buildPostJsonLd(detail())).toMatchObject({ "@type": "BlogPosting", headline: "A post", author: { name: "Chris" } });
  });
});

describe("mapPostDetail", () => {
  const raw = { id: 1, slug: "a-post", link: "https://wp.example.com/a-post/", content: { rendered: "" } };

  it("sanitises the body: scripts and inline handlers are removed, normal markup kept", () => {
    const out = mapPostDetail({
      ...raw,
      content: { rendered: '<h2>Hi</h2><p onclick="x()">t<script>alert(1)</script></p><img src="https://a.example/i.png" alt="i">' },
    })!;
    expect(out.contentHtml).toContain("<h2>Hi</h2>");
    expect(out.contentHtml).toContain('<img src="https://a.example/i.png" alt="i" />');
    expect(out.contentHtml).not.toMatch(/script|onclick/);
  });

  it("allows YouTube embeds only", () => {
    const yt = mapPostDetail({ ...raw, content: { rendered: '<iframe src="https://www.youtube.com/embed/x"></iframe>' } })!;
    expect(yt.contentHtml).toContain("youtube.com/embed/x");
    const evil = mapPostDetail({ ...raw, content: { rendered: '<iframe src="https://evil.example/x"></iframe>' } })!;
    expect(evil.contentHtml).not.toContain("evil.example");
  });

  it("yields an empty body when WordPress sent none, and null for a malformed item", () => {
    expect(mapPostDetail({ id: 1, slug: "a", link: "https://w.example/a/" })!.contentHtml).toBe("");
    expect(mapPostDetail({ slug: "no-id" })).toBeNull();
  });
});

describe("loadPostBySlug", () => {
  const cfg = { baseUrl: "https://wp.example.com", feedPath: "/feed/" };
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("asks WordPress for that slug with content and the embed fields", () => {
    const u = new URL(buildPostBySlugUrl(cfg, "a-post"));
    expect(u.searchParams.get("slug")).toBe("a-post");
    expect(u.searchParams.get("_fields")).toMatch(/\bcontent\b.*|.*\bcontent\b/);
    expect(u.searchParams.get("_fields")).toContain("_links");
  });

  it("returns the post, null when WordPress has none, and throws on an upstream failure", async () => {
    const body = [{ id: 1, slug: "a-post", link: "https://wp.example.com/a-post/", title: { rendered: "A" }, content: { rendered: "<p>x</p>" } }];
    fetchMock.mockResolvedValueOnce(Response.json(body));
    expect((await loadPostBySlug("a-post", cfg))?.contentHtml).toBe("<p>x</p>");

    fetchMock.mockResolvedValueOnce(Response.json([]));
    expect(await loadPostBySlug("nope", cfg)).toBeNull();

    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    await expect(loadPostBySlug("a-post", cfg)).rejects.toThrow();
  });
});
