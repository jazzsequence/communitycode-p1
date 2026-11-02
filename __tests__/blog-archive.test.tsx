// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlogArchiveView, blogArchiveBlock, type BlogArchiveProps } from "@/components/puck/podcast/blog-archive";
import type { Post } from "@/lib/posts";

const post = (id: number, over: Partial<Post> = {}): Post => ({
  id,
  slug: `post-${id}`,
  title: `Post ${id}`,
  excerpt: `Excerpt ${id}`,
  publishedAt: "2026-10-16T17:00:00.000Z",
  link: `https://example.com/2026/10/post-${id}/`,
  imageUrl: `https://example.com/app/uploads/p${id}.png`,
  authorName: "chris",
  ...over,
});

const ok = (posts: Post[], page: number, totalPages: number) =>
  Response.json({ posts, page, totalPages });

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const props: BlogArchiveProps = { ...blogArchiveBlock.defaultProps, postsPerPage: 3 };
let fetchMock: ReturnType<typeof vi.fn>;
const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BlogArchive", () => {
  it("shows a loading state, then cards linking to example.com", async () => {
    const d = deferred<Response>();
    fetchMock.mockReturnValueOnce(d.promise);
    render(<BlogArchiveView {...props} />);
    expect(screen.getByText("Loading posts…")).toBeTruthy();

    d.resolve(ok([post(1), post(2)], 1, 1));
    const link = await screen.findByRole("link", { name: /Post 1/ });
    expect(link.getAttribute("href")).toBe("https://example.com/2026/10/post-1/");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.queryByText("Loading posts…")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "From the blog" })).toBeTruthy();
    expect(screen.getAllByText("October 16, 2026", { selector: "time" })[0].getAttribute("datetime")).toBe(
      "2026-10-16T17:00:00.000Z",
    );
    expect(urls()[0]).toBe("/api/posts?page=1&per_page=3");
    // One page only: no Load more.
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("every external link carries rel=noopener noreferrer", async () => {
    fetchMock.mockResolvedValueOnce(ok([post(1), post(2)], 1, 1));
    const { container } = render(<BlogArchiveView {...props} />);
    await screen.findByText("Post 1");
    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBeGreaterThan(0);
    anchors.forEach((a) => expect(a.getAttribute("rel")).toBe("noopener noreferrer"));
  });

  it("honours showImages / showExcerpts and hides the decorative image link from assistive tech", async () => {
    fetchMock.mockResolvedValue(ok([post(1)], 1, 1));
    const { container, rerender } = render(<BlogArchiveView {...props} />);
    await screen.findByText("Post 1");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(container.querySelector("a[aria-hidden='true']")?.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByText("Excerpt 1")).toBeTruthy();

    rerender(<BlogArchiveView {...props} showImages={false} showExcerpts={false} />);
    await waitFor(() => expect(container.querySelector("img")).toBeNull());
    expect(screen.queryByText("Excerpt 1")).toBeNull();
  });

  it("copes with a post that has no image and no excerpt", async () => {
    fetchMock.mockResolvedValueOnce(ok([post(1, { imageUrl: null, excerpt: "" })], 1, 1));
    const { container } = render(<BlogArchiveView {...props} />);
    await screen.findByText("Post 1");
    expect(container.querySelector("img")).toBeNull();
  });

  it("uses the list layout class when asked", async () => {
    fetchMock.mockResolvedValueOnce(ok([post(1)], 1, 1));
    const { container } = render(<BlogArchiveView {...props} layout="list" />);
    await screen.findByText("Post 1");
    expect(container.querySelector(".cc-grid")).toBeNull();
    expect(container.querySelector(".cc-stack")).not.toBeNull();
  });

  it("clamps posts per page into 3-24", async () => {
    fetchMock.mockResolvedValue(ok([], 1, 1));
    render(<BlogArchiveView {...props} postsPerPage={500} />);
    await waitFor(() => expect(urls()[0]).toBe("/api/posts?page=1&per_page=24"));
  });

  it("shows an empty state", async () => {
    fetchMock.mockResolvedValueOnce(ok([], 1, 0));
    render(<BlogArchiveView {...props} />);
    expect(await screen.findByText("No posts yet. Check back soon.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows an error with Retry, and Retry recovers", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 502 }));
    fetchMock.mockResolvedValueOnce(ok([post(1)], 1, 1));
    render(<BlogArchiveView {...props} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("couldn't load the posts");
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Post 1")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats a network failure and a bad payload as errors", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { unmount } = render(<BlogArchiveView {...props} />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    unmount();

    fetchMock.mockResolvedValueOnce(Response.json({ nope: true }));
    render(<BlogArchiveView {...props} />);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  describe("load more", () => {
    it("appends the next page, moves focus to the first new post, and stops at the last page", async () => {
      fetchMock.mockResolvedValueOnce(ok([post(1), post(2), post(3)], 1, 2));
      fetchMock.mockResolvedValueOnce(ok([post(4), post(5)], 2, 2));
      render(<BlogArchiveView {...props} />);
      await screen.findByText("Post 1");

      await userEvent.click(screen.getByRole("button", { name: "Load more posts" }));
      await screen.findByText("Post 5");

      expect(urls()[1]).toBe("/api/posts?page=2&per_page=3");
      expect(screen.getAllByRole("article")).toHaveLength(5);
      expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
      await waitFor(() => expect(document.activeElement?.textContent).toContain("Post 4"));
    });

    it("ignores a second click while a page is loading", async () => {
      const d = deferred<Response>();
      fetchMock.mockResolvedValueOnce(ok([post(1)], 1, 3));
      fetchMock.mockReturnValueOnce(d.promise);
      render(<BlogArchiveView {...props} />);
      await screen.findByText("Post 1");

      const btn = screen.getByRole("button", { name: "Load more posts" });
      await userEvent.click(btn);
      await userEvent.click(btn);
      await userEvent.click(btn);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: "Loading…" }).getAttribute("aria-busy")).toBe("true");

      d.resolve(ok([post(2)], 2, 3));
      await screen.findByText("Post 2");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("never shows a post twice when the window shifts between pages", async () => {
      fetchMock.mockResolvedValueOnce(ok([post(1), post(2)], 1, 2));
      fetchMock.mockResolvedValueOnce(ok([post(2), post(3)], 2, 2));
      render(<BlogArchiveView {...props} />);
      await screen.findByText("Post 1");
      await userEvent.click(screen.getByRole("button", { name: "Load more posts" }));
      await screen.findByText("Post 3");
      expect(screen.getAllByText("Post 2")).toHaveLength(1);
    });

    it("keeps loaded posts and offers another try when a later page fails", async () => {
      fetchMock.mockResolvedValueOnce(ok([post(1)], 1, 2));
      fetchMock.mockResolvedValueOnce(new Response("{}", { status: 502 }));
      fetchMock.mockResolvedValueOnce(ok([post(2)], 2, 2));
      render(<BlogArchiveView {...props} />);
      await screen.findByText("Post 1");

      await userEvent.click(screen.getByRole("button", { name: "Load more posts" }));
      expect((await screen.findByRole("alert")).textContent).toContain("couldn't load more");
      expect(screen.getByText("Post 1")).toBeTruthy();

      await userEvent.click(screen.getByRole("button", { name: "Load more posts" }));
      await screen.findByText("Post 2");
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("races", () => {
    it("a slow response for old settings can't overwrite the new settings' posts", async () => {
      const slow = deferred<Response>();
      const fast = deferred<Response>();
      fetchMock.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);

      const { rerender } = render(<BlogArchiveView {...props} postsPerPage={3} />);
      rerender(<BlogArchiveView {...props} postsPerPage={6} />);
      expect(urls()).toEqual(["/api/posts?page=1&per_page=3", "/api/posts?page=1&per_page=6"]);

      fast.resolve(ok([post(20)], 1, 1));
      await screen.findByText("Post 20");
      // The stale response arrives afterwards and must be ignored.
      slow.resolve(ok([post(10)], 1, 1));
      await new Promise((r) => setTimeout(r, 20));
      expect(screen.queryByText("Post 10")).toBeNull();
      expect(screen.getByText("Post 20")).toBeTruthy();
    });

    it("aborts the in-flight request when settings change", async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const { rerender } = render(<BlogArchiveView {...props} postsPerPage={3} />);
      const firstSignal = (fetchMock.mock.calls[0][1] as RequestInit).signal as AbortSignal;
      expect(firstSignal.aborted).toBe(false);
      rerender(<BlogArchiveView {...props} postsPerPage={6} />);
      expect(firstSignal.aborted).toBe(true);
    });

    it("a load-more response that lands after settings changed is dropped", async () => {
      const more = deferred<Response>();
      fetchMock.mockResolvedValueOnce(ok([post(1)], 1, 2));
      fetchMock.mockReturnValueOnce(more.promise);
      fetchMock.mockResolvedValueOnce(ok([post(30)], 1, 1));
      const { rerender } = render(<BlogArchiveView {...props} postsPerPage={3} />);
      await screen.findByText("Post 1");
      await userEvent.click(screen.getByRole("button", { name: "Load more posts" }));

      rerender(<BlogArchiveView {...props} postsPerPage={6} />);
      await screen.findByText("Post 30");
      more.resolve(ok([post(2)], 2, 2));
      await new Promise((r) => setTimeout(r, 20));
      expect(screen.queryByText("Post 2")).toBeNull();
      expect(screen.queryByText("Post 1")).toBeNull();
    });
  });
});

describe("blogArchiveBlock config", () => {
  it("declares the editor fields and sane defaults", () => {
    expect(Object.keys(blogArchiveBlock.fields)).toEqual([
      "heading",
      "endpoint",
      "postsPerPage",
      "layout",
      "showImages",
      "showExcerpts",
    ]);
    expect(blogArchiveBlock.fields.postsPerPage).toMatchObject({ min: 3, max: 24 });
    expect(blogArchiveBlock.defaultProps).toMatchObject({ postsPerPage: 9, layout: "grid" });
  });
});

describe("BlogArchive endpoint field", () => {
  it("fetches the custom endpoint, not the default", async () => {
    fetchMock.mockResolvedValueOnce(ok([post(1)], 1, 1));
    render(<BlogArchiveView {...props} endpoint="https://api.example.org/v2/articles" />);
    await screen.findByText("Post 1");
    expect(urls()[0]).toBe("https://api.example.org/v2/articles?page=1&per_page=3");
  });

  it("appends params with & when the endpoint already has a query, on every page", async () => {
    fetchMock.mockResolvedValueOnce(ok([post(1)], 1, 2));
    fetchMock.mockResolvedValueOnce(ok([post(2)], 2, 2));
    render(<BlogArchiveView {...props} endpoint="/feeds/posts?x=1" />);
    await screen.findByText("Post 1");
    await userEvent.click(screen.getByRole("button", { name: "Load more posts" }));
    await screen.findByText("Post 2");
    expect(urls()).toEqual(["/feeds/posts?x=1&page=1&per_page=3", "/feeds/posts?x=1&page=2&per_page=3"]);
  });

  it.each(["javascript:alert(1)", "//evil.example/api", "data:text/plain,hi", "  ", "ftp://x.example/p", "/ok\\evil"])(
    "falls back to the default endpoint for unsafe value %j",
    async (endpoint) => {
      fetchMock.mockResolvedValueOnce(ok([], 1, 0));
      render(<BlogArchiveView {...props} endpoint={endpoint} />);
      await screen.findByText("No posts yet. Check back soon.");
      expect(urls()[0]).toBe("/api/posts?page=1&per_page=3");
    },
  );

  it("refetches when the endpoint changes", async () => {
    fetchMock.mockResolvedValueOnce(ok([post(1)], 1, 1));
    fetchMock.mockResolvedValueOnce(ok([post(2)], 1, 1));
    const { rerender } = render(<BlogArchiveView {...props} endpoint="/a" />);
    await screen.findByText("Post 1");
    rerender(<BlogArchiveView {...props} endpoint="/b" />);
    await screen.findByText("Post 2");
    expect(screen.queryByText("Post 1")).toBeNull();
    expect(urls()[1]).toBe("/b?page=1&per_page=3");
  });

  it("shows a 'not set up' message (not the error state) when the endpoint answers 501", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Blog isn't configured." }, { status: 501 }));
    render(<BlogArchiveView {...props} />);
    // Once visible, once in the live region.
    expect((await screen.findAllByText(/blog isn't set up yet/i)).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has an endpoint field defaulting to the shared default", () => {
    expect(blogArchiveBlock.fields.endpoint.type).toBe("text");
    expect(blogArchiveBlock.defaultProps.endpoint).toBe("/api/posts");
  });
});
