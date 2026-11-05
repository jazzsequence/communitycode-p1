// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuestGridView, clampColumns } from "@/components/podcast/guest-grid-view";
import { guestGridBlock } from "@/components/puck/podcast/guest-grid";
import type { AggregatedGuest } from "@/lib/guests";

const guest = (name: string, extra: Partial<AggregatedGuest> = {}): AggregatedGuest => ({
  name,
  photoUrl: null,
  role: "Guest",
  episodes: [{ slug: `episode-${name.toLowerCase().replace(/\W+/g, "-")}`, title: `Episode 1: ${name}`, season: 2, number: 36 }],
  ...extra,
});
const json = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as Response;

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GuestGridView", () => {
  it("shows loading, then guests with episode links and counts", async () => {
    fetchMock.mockResolvedValue(
      json({
        guests: [
          guest("Jacquie Capur"),
          guest("PJ Hagerty", {
            episodes: [
              { slug: "ep-35", title: "Episode 35: PJ Hagerty", season: 2, number: 35 },
              { slug: "ep-5", title: "Episode 5: PJ", season: 1, number: 5 },
            ],
          }),
        ],
      }),
    );
    render(<GuestGridView heading="Guests" />);
    expect(screen.getByText("Loading guests…")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Jacquie Capur" })).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/guests");
    expect(screen.getByText("1 episode")).toBeTruthy();
    expect(screen.getByText("2 episodes")).toBeTruthy();
    const pj = screen.getByRole("link", { name: "S1 E5: Episode 5: PJ" });
    expect(pj.getAttribute("href")).toBe("/episodes/ep-5");
    expect(screen.queryByText("Loading guests…")).toBeNull();
  });

  it("uses a decorative initials avatar without a photo and an empty-alt image with one", async () => {
    fetchMock.mockResolvedValue(json({ guests: [guest("Jacquie Capur"), guest("PJ Hagerty", { photoUrl: "https://x.test/pj.jpg" })] }));
    const { container } = render(<GuestGridView />);
    await screen.findByRole("heading", { name: "PJ Hagerty" });
    const avatar = container.querySelector(".cc-avatar");
    expect(avatar?.textContent).toBe("JC");
    expect(avatar?.getAttribute("aria-hidden")).toBe("true");
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("src")).toBe("https://x.test/pj.jpg");
  });

  it("can hide the episode count, and caps with limit", async () => {
    fetchMock.mockResolvedValue(json({ guests: [guest("A One"), guest("B Two"), guest("C Three")] }));
    render(<GuestGridView showEpisodeCount={false} limit={2} />);
    await screen.findByRole("heading", { name: "A One" });
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
    expect(screen.queryByText("1 episode")).toBeNull();
  });

  it("applies the column count as a clamped CSS variable", async () => {
    fetchMock.mockResolvedValue(json({ guests: [guest("A One")] }));
    const { container } = render(<GuestGridView columns={4} />);
    await screen.findByRole("heading", { name: "A One" });
    expect((container.querySelector(".cc-guest-grid") as HTMLElement).style.getPropertyValue("--cc-guest-cols")).toBe("4");
    expect(clampColumns(1)).toBe(2);
    expect(clampColumns(9)).toBe(4);
    expect(clampColumns(undefined)).toBe(3);
  });

  it("shows an empty state", async () => {
    fetchMock.mockResolvedValue(json({ guests: [] }));
    render(<GuestGridView />);
    expect(await screen.findByText("No guests to show yet.")).toBeTruthy();
  });

  it("shows an error with a working retry", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "x" }, false, 502));
    render(<GuestGridView />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn’t be loaded/);
    fetchMock.mockResolvedValueOnce(json({ guests: [guest("A One")] }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "A One" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("treats a network failure or malformed body as an error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const { unmount } = render(<GuestGridView />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    unmount();
    fetchMock.mockResolvedValueOnce(json({ nope: 1 }));
    render(<GuestGridView />);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("aborts the request on unmount without an error update", async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_u: string, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return new Promise((_, reject) => signal?.addEventListener("abort", () => reject(Object.assign(new Error("a"), { name: "AbortError" }))));
    });
    const { unmount } = render(<GuestGridView />);
    await waitFor(() => expect(signal).toBeDefined());
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});

describe("generic endpoint and links", () => {
  it("fetches a custom endpoint as given (no query appended)", async () => {
    fetchMock.mockResolvedValue(json({ guests: [] }));
    render(<GuestGridView endpoint="https://api.example.test/people?x=1" />);
    await screen.findByText("No guests to show yet.");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/people?x=1");
  });

  it.each(["javascript:alert(1)", "//evil.example/g", "", "  "])("falls back to the default for unsafe/empty %j", async (endpoint) => {
    fetchMock.mockResolvedValue(json({ guests: [] }));
    render(<GuestGridView endpoint={endpoint} />);
    await screen.findByText("No guests to show yet.");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/guests");
  });

  it("a custom link template changes hrefs; missing values render plain text", async () => {
    fetchMock.mockResolvedValue(
      json({
        guests: [
          guest("A One", {
            episodes: [
              { slug: "a", title: "A", season: 2, number: 3 },
              { slug: "b", title: "B", season: null, number: null },
            ],
          }),
        ],
      }),
    );
    render(<GuestGridView episodeLinkTemplate="/pod/{season}-{number}/{slug}" />);
    await screen.findByRole("heading", { name: "A One" });
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/pod/2-3/a");
  });

  it("an unsafe link template yields no links", async () => {
    fetchMock.mockResolvedValue(json({ guests: [guest("A One")] }));
    render(<GuestGridView episodeLinkTemplate="javascript:alert({slug})" />);
    await screen.findByRole("heading", { name: "A One" });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

describe("excluding roles", () => {
  const people = [guest("Host Person", { role: "Host" }), guest("Guest Person", { role: "Guest" }), guest("Pat Co", { role: "Co-host" })];

  it("hides hosts by default", async () => {
    fetchMock.mockResolvedValue(json({ guests: people }));
    render(<GuestGridView />);
    await screen.findByRole("heading", { name: "Guest Person" });
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
  });

  it("follows a custom pattern, and an empty one shows everyone", async () => {
    fetchMock.mockResolvedValue(json({ guests: people }));
    const { unmount } = render(<GuestGridView excludeRolesPattern="^guest$" />);
    await screen.findByRole("heading", { name: "Host Person" });
    expect(screen.queryByRole("heading", { name: "Guest Person" })).toBeNull();
    unmount();
    render(<GuestGridView excludeRolesPattern="" />);
    await screen.findByRole("heading", { name: "Guest Person" });
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("the block field defaults to host|co-host and reaches the view", async () => {
    expect(guestGridBlock.defaultProps.excludeRoles).toBe("host|co-host");
    fetchMock.mockResolvedValue(json({ guests: people }));
    render(guestGridBlock.render(guestGridBlock.defaultProps));
    await screen.findByRole("heading", { name: "Guest Person" });
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
  });

  it("limit applies after hiding hosts", async () => {
    fetchMock.mockResolvedValue(json({ guests: people }));
    render(<GuestGridView limit={1} />);
    await screen.findByRole("heading", { name: "Guest Person" });
  });
});

describe("block", () => {
  it("renders in the editor with defaults and with no props", async () => {
    fetchMock.mockResolvedValue(json({ guests: [] }));
    const { unmount } = render(guestGridBlock.render(guestGridBlock.defaultProps));
    expect(screen.getByRole("heading", { name: "Guests" })).toBeTruthy();
    expect(await screen.findByText("No guests to show yet.")).toBeTruthy();
    unmount();
    expect(guestGridBlock.defaultProps.endpoint).toBe("/api/guests");
    expect(guestGridBlock.defaultProps.episodeLinkTemplate).toBe("/episodes/{slug}");
    render(guestGridBlock.render({}));
    expect(await screen.findByText("No guests to show yet.")).toBeTruthy();
  });
});
