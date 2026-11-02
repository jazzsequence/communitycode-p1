// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteSearchView, clampMax } from "@/components/podcast/search-view";
import { siteSearchBlock } from "@/components/puck/podcast/site-search";

function episodes(...titles: string[]) {
  return {
    episodes: titles.map((t, i) => ({
      slug: `slug-${i}-${t.toLowerCase().replace(/\W+/g, "-")}`,
      title: t,
      season: 2,
      number: 36 - i,
      publishedAt: "2026-10-14T12:00:00Z",
    })),
    nextCursor: null,
    origin: "wordpress",
  };
}
const json = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as Response;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const type = (value: string) => fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

describe("SiteSearchView", () => {
  it("is a labelled search form and does nothing on mount", () => {
    render(<SiteSearchView heading="Search" />);
    expect(screen.getByRole("search")).toBeTruthy();
    expect(screen.getByLabelText("Search episodes")).toBeTruthy();
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not search under 2 characters", async () => {
    render(<SiteSearchView />);
    type("p");
    await advance(1000);
    expect(fetchMock).not.toHaveBeenCalled();
    type("  p ");
    await advance(1000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces: one request ~250ms after the last keystroke", async () => {
    fetchMock.mockResolvedValue(json(episodes("Episode 35: PJ Hagerty")));
    render(<SiteSearchView maxResults={5} />);
    type("pj");
    await advance(100);
    type("pj h");
    await advance(100);
    type("pj ha");
    await advance(249);
    expect(fetchMock).not.toHaveBeenCalled();
    await advance(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes?q=pj+ha&limit=5");
  });

  it("renders results as links with S/E label + date and announces the count", async () => {
    fetchMock.mockResolvedValue(json(episodes("Episode 35: PJ Hagerty", "Episode 34: Maciek Palmowski")));
    render(<SiteSearchView />);
    type("episode");
    await advance(250);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("/episodes/slug-0-episode-35-pj-hagerty");
    expect(links[0].textContent).toContain("Episode 35: PJ Hagerty");
    expect(links[0].textContent).toContain("S2 E36 · October 14, 2026");
    expect(screen.getByRole("status").textContent).toBe("2 episodes found.");
  });

  it("uses the singular and notes when more results exist", async () => {
    fetchMock.mockResolvedValueOnce(json(episodes("Only one")));
    render(<SiteSearchView />);
    type("only");
    await advance(250);
    expect(screen.getByRole("status").textContent).toBe("1 episode found.");
    fetchMock.mockResolvedValueOnce(json({ ...episodes("A", "B"), nextCursor: "abc" }));
    type("more");
    await advance(250);
    expect(screen.getByRole("status").textContent).toBe("Showing the first 2 matching episodes.");
  });

  it("shows loading, then an empty state", async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    render(<SiteSearchView />);
    type("zzzz");
    expect(screen.getByRole("status").textContent).toBe("Searching…");
    await advance(250);
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
    await act(async () => resolve(json(episodes())));
    expect(screen.getByRole("status").textContent).toBe("No episodes found for “zzzz”.");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("shows an error state for a failed request and recovers on retry", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "x" }, false, 502));
    render(<SiteSearchView />);
    type("pj");
    await advance(250);
    expect(screen.getByRole("status").textContent).toBe("Search is unavailable right now.");
    fetchMock.mockResolvedValueOnce(json(episodes("Episode 35: PJ Hagerty")));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await advance(0);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("treats a network failure and a malformed body as errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    render(<SiteSearchView />);
    type("pj");
    await advance(250);
    expect(screen.getByRole("status").textContent).toBe("Search is unavailable right now.");
    fetchMock.mockResolvedValueOnce(json({ nope: true }));
    type("pjh");
    await advance(250);
    expect(screen.getByRole("status").textContent).toBe("Search is unavailable right now.");
  });

  it("is race-safe: a slow earlier response cannot overwrite a newer one", async () => {
    const resolvers: ((r: Response) => void)[] = [];
    // These mocks deliberately ignore the abort signal, so only the stale flag can protect us.
    fetchMock.mockImplementation(() => new Promise<Response>((r) => resolvers.push(r)));
    render(<SiteSearchView />);
    type("first");
    await advance(250);
    type("second");
    await advance(250);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Newer resolves first, then the stale one arrives late.
    await act(async () => resolvers[1](json(episodes("Second result"))));
    await act(async () => resolvers[0](json(episodes("First result"))));
    expect(screen.queryByText("First result")).toBeNull();
    expect(screen.getByText("Second result")).toBeTruthy();
  });

  it("aborts the in-flight request when the query changes", async () => {
    const signals: AbortSignal[] = [];
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      return new Promise<Response>(() => {});
    });
    render(<SiteSearchView />);
    type("first");
    await advance(250);
    expect(signals[0].aborted).toBe(false);
    type("second");
    expect(signals[0].aborted).toBe(true);
  });

  it("an aborted request does not flip to the error state", async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("a"), { name: "AbortError" })))),
    );
    render(<SiteSearchView />);
    type("first");
    await advance(250);
    type("");
    await advance(10);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("submitting searches immediately without waiting for the debounce", async () => {
    fetchMock.mockResolvedValue(json(episodes("Hit")));
    render(<SiteSearchView />);
    type("hit");
    fireEvent.submit(screen.getByRole("search"));
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches a custom endpoint, appending to an existing query string", async () => {
    fetchMock.mockResolvedValue(json(episodes("Hit")));
    render(<SiteSearchView endpoint="https://api.example.test/search?x=1" maxResults={4} />);
    type("hit");
    await advance(250);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/search?x=1&q=hit&limit=4");
  });

  it.each(["javascript:alert(1)", "//evil.example/x", "data:text/plain,x", "   ", ""])(
    "falls back to the default endpoint for unsafe/empty %j",
    async (endpoint) => {
      fetchMock.mockResolvedValue(json(episodes("Hit")));
      render(<SiteSearchView endpoint={endpoint} />);
      type("hit");
      await advance(250);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes?q=hit&limit=8");
    },
  );

  it("a custom link template changes result hrefs; a template needing missing data renders plain text", async () => {
    const body = episodes("Hit");
    body.episodes.push({ slug: "no-number", title: "No number", season: null, number: null, publishedAt: "2026-01-01T00:00:00Z" });
    fetchMock.mockResolvedValue(json(body));
    render(<SiteSearchView episodeLinkTemplate="/show/{season}/{number}/{slug}" />);
    type("hit");
    await advance(250);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/show/2/36/slug-0-hit");
    expect(screen.getByText("No number")).toBeTruthy();
  });

  it("an unsafe link template yields no link", async () => {
    fetchMock.mockResolvedValue(json(episodes("Hit")));
    render(<SiteSearchView episodeLinkTemplate="javascript:alert({slug})" />);
    type("hit");
    await advance(250);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Hit")).toBeTruthy();
  });

  it("the no-JS form action is only set when configured and safe", () => {
    const { unmount } = render(<SiteSearchView />);
    expect(screen.getByRole("search").hasAttribute("action")).toBe(false);
    unmount();
    const r = render(<SiteSearchView formAction="/find" />);
    expect(screen.getByRole("search").getAttribute("action")).toBe("/find");
    r.unmount();
    render(<SiteSearchView formAction="javascript:alert(1)" />);
    expect(screen.getByRole("search").hasAttribute("action")).toBe(false);
  });

  it("clamps maxResults to 3-20", () => {
    expect(clampMax(1)).toBe(3);
    expect(clampMax(100)).toBe(20);
    expect(clampMax(undefined)).toBe(8);
    expect(clampMax("12")).toBe(12);
  });
});

describe("block", () => {
  it("renders with defaults and with nothing, without fetching", () => {
    const { unmount } = render(siteSearchBlock.render(siteSearchBlock.defaultProps));
    expect(screen.getByRole("searchbox")).toBeTruthy();
    unmount();
    render(siteSearchBlock.render({}));
    expect(screen.getByRole("search")).toBeTruthy();
    expect(siteSearchBlock.defaultProps.endpoint).toBe("/api/episodes");
    expect(Object.keys(siteSearchBlock.fields)).toEqual(expect.arrayContaining(["endpoint", "episodeLinkTemplate"]));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
