// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EpisodeCardView } from "@/components/podcast/episode-card";
import { EpisodeArchiveRender } from "@/components/puck/podcast/episode-archive";
import { LatestEpisodeHeroRender } from "@/components/puck/podcast/latest-episode-hero";
import type { EpisodeCard, EpisodeListResponse } from "@/lib/episodes/dto";

function ep(n: number, over: Partial<EpisodeCard> = {}): EpisodeCard {
  return {
    id: `ep-${n}`,
    slug: `episode-${n}`,
    title: `Episode ${n} title`,
    description: `Description ${n}`,
    publishedAt: "2026-03-05T12:00:00Z",
    season: 2,
    number: n,
    type: "full",
    explicit: false,
    durationSeconds: 3723,
    audio: null,
    artworkUrl: `https://img.test/${n}.jpg`,
    guests: [{ name: `Guest ${n}`, role: null, photoUrl: null }],
    transcript: null,
    links: {},
    origin: "wordpress",
    ...over,
  };
}

const list = (eps: EpisodeCard[], nextCursor: string | null = null, seasons?: number[]): EpisodeListResponse => ({
  episodes: eps,
  nextCursor,
  origin: "wordpress",
  ...(seasons ? { seasons } : {}),
});

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
const fail = () => Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({ error: "x" }) } as Response);

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const urls = () => fetchMock.mock.calls.map(([u]) => new URL(u, "http://x"));
const lastUrl = () => urls().at(-1)!;
const cards = () => document.querySelectorAll("[data-episode-card]");

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("EpisodeArchive", () => {
  it("loads page one and renders a card per episode, linking to the detail page", async () => {
    fetchMock.mockImplementation(() => ok(list([ep(1), ep(2)], null, [2, 1])));
    render(<EpisodeArchiveRender />);

    expect(screen.getByRole("status").textContent).toContain("Loading episodes");
    await waitFor(() => expect(cards()).toHaveLength(2));

    expect(lastUrl().searchParams.get("limit")).toBe("12");
    expect(lastUrl().searchParams.get("type")).toBe("full");
    expect(lastUrl().searchParams.has("cursor")).toBe(false);
    expect(screen.getByRole("link", { name: "Episode 1 title" }).getAttribute("href")).toBe("/episodes/episode-1");
    expect(screen.getByRole("status").textContent).toBe("Showing 2 episodes");
    // season options come from the API's seasons array, plus "All seasons"
    const options = within(screen.getByRole("combobox", { name: "Season" })).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["All seasons", "Season 2", "Season 1"]);
    // no "Load more" without a cursor
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("changing the season refetches with season= and replaces the list", async () => {
    fetchMock.mockImplementation((u) =>
      new URL(u, "http://x").searchParams.get("season") === "1" ? ok(list([ep(9, { season: 1 })])) : ok(list([ep(1), ep(2)], "c1", [2, 1])),
    );
    render(<EpisodeArchiveRender />);
    await waitFor(() => expect(cards()).toHaveLength(2));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Season" }), "1");

    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(lastUrl().searchParams.get("season")).toBe("1");
    expect(lastUrl().searchParams.has("cursor")).toBe(false);
    expect(screen.queryByText("Episode 1 title")).toBeNull();
    expect(screen.getByText("Episode 9 title")).toBeTruthy();
    // seasons survive the filter change (later responses may omit them)
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("load more appends, sends the cursor with the SAME filters, and focuses the first new card", async () => {
    fetchMock.mockImplementation((u) => {
      const sp = new URL(u, "http://x").searchParams;
      return sp.get("cursor") === "opaque/cur=="
        ? ok(list([ep(3), ep(4)], null))
        : ok(list([ep(1), ep(2)], "opaque/cur==", [2, 1]));
    });
    render(<EpisodeArchiveRender showTypeFilter pageSize={6} defaultType="all" />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Season" }), "2");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Type" }), "bonus");
    await waitFor(() => expect(lastUrl().searchParams.get("type")).toBe("bonus"));
    await screen.findByRole("button", { name: "Load more" });
    await waitFor(() => expect(cards()).toHaveLength(2));

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => expect(cards()).toHaveLength(4));
    const u = lastUrl();
    expect(u.searchParams.get("cursor")).toBe("opaque/cur==");
    expect(u.searchParams.get("season")).toBe("2");
    expect(u.searchParams.get("type")).toBe("bonus");
    expect(u.searchParams.get("limit")).toBe("6");
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Episode 3 title" }));
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull(); // last page
  });

  it("a filter change after load more resets the list AND drops the cursor", async () => {
    fetchMock.mockImplementation((u) => {
      const sp = new URL(u, "http://x").searchParams;
      if (sp.get("season") === "1") return ok(list([ep(9)], null));
      return sp.get("cursor") ? ok(list([ep(3)], "c2")) : ok(list([ep(1), ep(2)], "c1", [2, 1]));
    });
    render(<EpisodeArchiveRender />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(cards()).toHaveLength(3));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Season" }), "1");

    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(lastUrl().searchParams.has("cursor")).toBe(false);
  });

  it("drops a slow response for an old filter that lands after a newer one", async () => {
    const slowSeason1 = deferred<Response>();
    fetchMock.mockImplementation((u) => {
      const season = new URL(u, "http://x").searchParams.get("season");
      if (season === "1") return slowSeason1.promise; // ignores AbortSignal on purpose: worst case
      if (season === "2") return ok(list([ep(20)]));
      return ok(list([ep(1)], null, [2, 1]));
    });
    render(<EpisodeArchiveRender />);
    await waitFor(() => expect(cards()).toHaveLength(1));
    const select = screen.getByRole("combobox", { name: "Season" });

    await userEvent.selectOptions(select, "1"); // slow, never resolves yet
    await userEvent.selectOptions(select, "2"); // fast
    await waitFor(() => expect(screen.getByText("Episode 20 title")).toBeTruthy());

    await act(async () => {
      slowSeason1.resolve(await ok(list([ep(10, { season: 1 })])));
    });

    expect(screen.getByText("Episode 20 title")).toBeTruthy();
    expect(screen.queryByText("Episode 10 title")).toBeNull();
    expect(cards()).toHaveLength(1);
  });

  it("treats an aborted request as nothing, not as an error", async () => {
    fetchMock.mockImplementation((u, init) => {
      const season = new URL(u, "http://x").searchParams.get("season");
      if (season === "1")
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
      return ok(list([ep(season ? 20 : 1)], null, [2, 1]));
    });
    render(<EpisodeArchiveRender />);
    await waitFor(() => expect(cards()).toHaveLength(1));
    const select = screen.getByRole("combobox", { name: "Season" });
    await userEvent.selectOptions(select, "1");
    await userEvent.selectOptions(select, "2");

    await waitFor(() => expect(screen.getByText("Episode 20 title")).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an error with Retry, and Retry refetches", async () => {
    fetchMock.mockImplementationOnce(() => fail()).mockImplementation(() => ok(list([ep(1)])));
    render(<EpisodeArchiveRender />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("temporarily unavailable");
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a failed load-more keeps the list and Retry re-requests the same cursor", async () => {
    let failNext = true;
    fetchMock.mockImplementation((u) => {
      const sp = new URL(u, "http://x").searchParams;
      if (!sp.get("cursor")) return ok(list([ep(1), ep(2)], "c1", [2]));
      if (failNext) {
        failNext = false;
        return fail();
      }
      return ok(list([ep(3)]));
    });
    render(<EpisodeArchiveRender />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await screen.findByRole("alert");
    expect(cards()).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(cards()).toHaveLength(3));
    expect(lastUrl().searchParams.get("cursor")).toBe("c1");
  });

  it("shows 'No episodes yet' when the API returns none", async () => {
    fetchMock.mockImplementation(() => ok(list([], null, [])));
    render(<EpisodeArchiveRender />);
    await waitFor(() => expect(screen.getAllByText("No episodes yet").length).toBeGreaterThan(0));
    expect(cards()).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("does not throw with no data / a broken backend (editor canvas)", async () => {
    // network failure
    fetchMock.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));
    const { unmount } = render(<EpisodeArchiveRender />);
    expect((await screen.findByRole("alert")).textContent).toContain("unavailable");
    unmount();

    // 200 but not the expected shape
    fetchMock.mockImplementation(() => ok({}));
    const second = render(<EpisodeArchiveRender />);
    expect((await screen.findByRole("alert")).textContent).toContain("unavailable");
    second.unmount();

    // no fetch at all, no props
    vi.stubGlobal("fetch", undefined);
    render(<EpisodeArchiveRender />);
    expect((await screen.findByRole("alert")).textContent).toContain("unavailable");
  });

  it("clamps an out-of-range page size", async () => {
    fetchMock.mockImplementation(() => ok(list([])));
    render(<EpisodeArchiveRender pageSize={500} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastUrl().searchParams.get("limit")).toBe("24");
  });
});

describe("LatestEpisodeHero", () => {
  it("renders the newest full episode with a Listen link and a YouTube link", async () => {
    fetchMock.mockImplementation(() =>
      ok(list([ep(38, { links: { youtube: "https://youtube.com/watch?v=abc" }, guests: [{ name: "A", role: null, photoUrl: null }, { name: "B", role: null, photoUrl: null }] })])),
    );
    render(<LatestEpisodeHeroRender />);

    expect(await screen.findByRole("heading", { name: "Episode 38 title" })).toBeTruthy();
    expect(lastUrl().searchParams.get("limit")).toBe("1");
    expect(lastUrl().searchParams.get("type")).toBe("full");
    expect(screen.getByText("Latest episode · S2 E38")).toBeTruthy();
    expect(screen.getByText("March 5, 2026")).toBeTruthy();
    expect(screen.getByText("1:02:03")).toBeTruthy();
    expect(screen.getByText("With A, B")).toBeTruthy();
    expect(screen.getByRole("link", { name: /^Listen/ }).getAttribute("href")).toBe("/episodes/episode-38");
    expect(screen.getByRole("link", { name: /Watch on YouTube/ }).getAttribute("href")).toBe("https://youtube.com/watch?v=abc");
  });

  it("omits YouTube when absent or not http(s); honours field toggles", async () => {
    fetchMock.mockImplementation(() => ok(list([ep(1, { links: { youtube: "javascript:alert(1)" } })])));
    const { container } = render(
      <LatestEpisodeHeroRender eyebrow="Newest" buttonLabel="Play" showArtwork={false} showDescription={false} />,
    );
    await screen.findByRole("heading", { name: "Episode 1 title" });
    expect(screen.queryByRole("link", { name: /YouTube/ })).toBeNull();
    expect(screen.getByRole("link", { name: /^Play/ })).toBeTruthy();
    expect(screen.getByText("Newest · S2 E1")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText("Description 1")).toBeNull();
  });

  it("handles empty and error (with Retry) without throwing", async () => {
    fetchMock.mockImplementationOnce(() => fail()).mockImplementation(() => ok(list([])));
    render(<LatestEpisodeHeroRender />);
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No episodes yet")).toBeTruthy();
  });
});

describe("EpisodeCardView", () => {
  it("is one link, with decorative artwork, and no show.fm pill for WordPress data", () => {
    const { container } = render(<EpisodeCardView episode={ep(5)} />);
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(screen.queryByText("via show.fm")).toBeNull();
    expect(screen.getByRole("link", { name: "Episode 5 title" })).toBeTruthy();
  });
  it("shows the show.fm pill only when origin is showfm, and labels non-full types", () => {
    render(<EpisodeCardView episode={ep(6, { origin: "showfm", type: "bonus" })} />);
    expect(screen.getByText("via show.fm")).toBeTruthy();
    expect(screen.getByText("S2 E6 · bonus")).toBeTruthy();
  });
});

describe("configurable endpoint and link template", () => {
  beforeEach(() => {
    fetchMock.mockImplementation(() => ok(list([ep(1, { slug: "my-slug", id: "abc" })], null, [2])));
  });

  it("archive fetches the custom endpoint, appending params with ? or & as needed", async () => {
    const { unmount } = render(<EpisodeArchiveRender endpoint="https://api.example.test/list" pageSize={6} />);
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/list?limit=6&type=full");
    unmount();

    fetchMock.mockClear();
    render(<EpisodeArchiveRender endpoint="/feeds/eps?x=1" pageSize={6} />);
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/feeds/eps?x=1&limit=6&type=full");
    expect(lastUrl().searchParams.get("x")).toBe("1");
  });

  it("hero fetches the custom endpoint too", async () => {
    render(<LatestEpisodeHeroRender endpoint="/feeds/eps?x=1" />);
    await screen.findByRole("heading", { name: "Episode 1 title" });
    expect(fetchMock.mock.calls[0][0]).toBe("/feeds/eps?x=1&limit=1&type=full");
  });

  it.each(["javascript:alert(1)", "//evil.example/api", "data:text/json,{}", "/api\\x"])(
    "falls back to the default endpoint for unsafe value %s",
    async (bad) => {
      render(<EpisodeArchiveRender endpoint={bad} />);
      await waitFor(() => expect(cards()).toHaveLength(1));
      expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes?limit=12&type=full");
      cleanup();
      fetchMock.mockClear();
      render(<LatestEpisodeHeroRender endpoint={bad} />);
      await screen.findByRole("heading", { name: "Episode 1 title" });
      expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes?limit=1&type=full");
    },
  );

  it("a custom link template changes the card and hero hrefs (values URL-encoded)", async () => {
    render(<EpisodeArchiveRender episodeLinkTemplate="/shows/{season}/{slug}?ref={id}" />);
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(screen.getByRole("link", { name: "Episode 1 title" }).getAttribute("href")).toBe("/shows/2/my-slug?ref=abc");
    cleanup();

    render(<LatestEpisodeHeroRender episodeLinkTemplate="https://example.test/p/{slug}" />);
    await screen.findByRole("heading", { name: "Episode 1 title" });
    expect(screen.getByRole("link", { name: /^Listen/ }).getAttribute("href")).toBe("https://example.test/p/my-slug");
  });

  it("a template with a missing value renders a non-link card (and no Listen button)", async () => {
    fetchMock.mockImplementation(() => ok(list([ep(1, { season: null })])));
    render(<EpisodeArchiveRender episodeLinkTemplate="/s/{season}/{slug}" />);
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(screen.getByText("Episode 1 title")).toBeTruthy();
    expect(document.querySelectorAll("[data-episode-card] a")).toHaveLength(0);
    expect(document.body.innerHTML).not.toContain("undefined");
    cleanup();

    render(<LatestEpisodeHeroRender episodeLinkTemplate="/s/{season}/{slug}" />);
    await screen.findByRole("heading", { name: "Episode 1 title" });
    expect(screen.queryByRole("link", { name: /^Listen/ })).toBeNull();
  });

  it("an unsafe expanded link (javascript: scheme) is not rendered as an href", async () => {
    render(<EpisodeArchiveRender episodeLinkTemplate="javascript:{slug}" />);
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(document.querySelectorAll("[data-episode-card] a")).toHaveLength(0);
  });

  it("empty/undefined props fall back to defaults (content saved before the fields existed)", async () => {
    render(<EpisodeArchiveRender endpoint="" episodeLinkTemplate="" heading={undefined} />);
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes?limit=12&type=full");
    expect(screen.getByRole("link", { name: "Episode 1 title" }).getAttribute("href")).toBe("/episodes/my-slug");
    expect(screen.getByRole("heading", { name: "All episodes" })).toBeTruthy();
  });
});
