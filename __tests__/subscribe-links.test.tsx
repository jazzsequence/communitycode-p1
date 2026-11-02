// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubscribeLinksView } from "@/components/podcast/subscribe-links-view";
import { DEFAULT_SUBSCRIBE_ENTRIES, feedUrlFor, resolveEntries } from "@/components/podcast/subscribe-data";
import { subscribeLinksBlock } from "@/components/puck/podcast/subscribe-links";
import { site } from "@/content/site";

vi.mock("@/content/site", () => import("./stubs/site"));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("defaults", () => {
  it("contain only Apple Podcasts and RSS from site config", () => {
    expect(DEFAULT_SUBSCRIBE_ENTRIES.map((e) => [e.platform, e.url])).toEqual([
      ["apple", site.appleUrl],
      ["rss", site.feedUrl],
    ]);
  });
});

describe("SubscribeLinksView", () => {
  it("renders default links with accessible names", () => {
    render(<SubscribeLinksView entries={DEFAULT_SUBSCRIBE_ENTRIES} />);
    expect(screen.getByRole("link", { name: "Subscribe on Apple Podcasts" }).getAttribute("href")).toBe(site.appleUrl);
    expect(screen.getByRole("link", { name: "Subscribe on RSS" }).getAttribute("href")).toBe(site.feedUrl);
  });

  it("hides entries with empty or unsafe URLs (no dead buttons)", () => {
    render(
      <SubscribeLinksView
        entries={[
          { platform: "apple", url: site.appleUrl },
          { platform: "spotify", url: "" },
          { platform: "youtube", url: "   " },
          { platform: "overcast", url: "javascript:alert(1)" },
          { platform: "amazon", url: "data:text/html,x" },
          { platform: "other", url: "//evil.example" },
          { platform: "pocketcasts", url: "mailto:a@b.co" },
        ]}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Spotify|YouTube|Overcast/ })).toBeNull();
  });

  it("uses a custom label as the visible text and keeps the platform in the name", () => {
    render(<SubscribeLinksView entries={[{ platform: "spotify", url: "https://open.spotify.com/show/x", label: "Listen now" }]} />);
    const a = screen.getByRole("link", { name: "Listen now (Spotify)" });
    expect(a.textContent).toContain("Listen now");
  });

  it("shows an empty message when nothing is renderable", () => {
    render(<SubscribeLinksView entries={[{ platform: "spotify", url: "" }]} showCopyFeed={false} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("No subscribe links yet.")).toBeTruthy();
  });

  it("renders with no props at all", () => {
    render(<SubscribeLinksView />);
    expect(screen.getByRole("button", { name: "Copy RSS feed URL" })).toBeTruthy();
  });

  it("can hide the copy button", () => {
    render(<SubscribeLinksView entries={DEFAULT_SUBSCRIBE_ENTRIES} showCopyFeed={false} />);
    expect(screen.queryByRole("button", { name: "Copy RSS feed URL" })).toBeNull();
  });

  describe("copy RSS feed URL", () => {
    beforeEach(() => {
      Object.defineProperty(document, "execCommand", { value: vi.fn(() => false), configurable: true, writable: true });
    });

    it("uses the async clipboard and announces it in a polite live region", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      render(<SubscribeLinksView entries={DEFAULT_SUBSCRIBE_ENTRIES} />);
      const status = screen.getByRole("status");
      expect(status.getAttribute("aria-live")).toBe("polite");
      expect(status.textContent).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "Copy RSS feed URL" }));
      expect(await screen.findByText("RSS feed URL copied to clipboard.")).toBeTruthy();
      expect(writeText).toHaveBeenCalledWith(site.feedUrl);
      expect(screen.getByRole("status").textContent).toBe("RSS feed URL copied to clipboard.");
    });

    it("copies the editor's own RSS URL when it is safe, else the site feed", () => {
      expect(feedUrlFor([{ platform: "rss", url: "https://feeds.example/x.xml" }])).toBe("https://feeds.example/x.xml");
      expect(feedUrlFor([{ platform: "rss", url: "javascript:alert(1)" }])).toBe(site.feedUrl);
      expect(feedUrlFor([])).toBe(site.feedUrl);
    });

    it("falls back to execCommand when the clipboard API is missing", async () => {
      vi.stubGlobal("navigator", {});
      (document.execCommand as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<SubscribeLinksView entries={DEFAULT_SUBSCRIBE_ENTRIES} />);
      fireEvent.click(screen.getByRole("button", { name: "Copy RSS feed URL" }));
      expect(await screen.findByText("RSS feed URL copied to clipboard.")).toBeTruthy();
      expect(document.execCommand).toHaveBeenCalledWith("copy");
    });

    it("falls back to execCommand when writeText rejects", async () => {
      vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
      (document.execCommand as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<SubscribeLinksView entries={DEFAULT_SUBSCRIBE_ENTRIES} />);
      fireEvent.click(screen.getByRole("button", { name: "Copy RSS feed URL" }));
      expect(await screen.findByText("RSS feed URL copied to clipboard.")).toBeTruthy();
    });

    it("shows the URL in a selected read-only field when every copy path fails", async () => {
      vi.stubGlobal("navigator", {});
      render(<SubscribeLinksView entries={DEFAULT_SUBSCRIBE_ENTRIES} />);
      fireEvent.click(screen.getByRole("button", { name: "Copy RSS feed URL" }));
      const input = (await screen.findByLabelText("RSS feed URL")) as HTMLInputElement;
      expect(input.readOnly).toBe(true);
      expect(input.value).toBe(site.feedUrl);
      expect(screen.getByRole("status").textContent).toMatch(/copy it manually/);
    });
  });
});

describe("block", () => {
  it("renders from defaults and with no props", () => {
    const { unmount } = render(subscribeLinksBlock.render(subscribeLinksBlock.defaultProps));
    expect(screen.getAllByRole("link")).toHaveLength(2);
    unmount();
    render(subscribeLinksBlock.render({}));
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("offers Spotify/YouTube/Overcast as selectable platforms", () => {
    const opts = subscribeLinksBlock.fields.links.arrayFields.platform.options.map((o) => o.label);
    expect(opts).toEqual(expect.arrayContaining(["Spotify", "YouTube", "Overcast", "Apple Podcasts", "RSS"]));
  });

  it("resolveEntries tolerates junk", () => {
    expect(resolveEntries(undefined)).toEqual([]);
    expect(resolveEntries([null as never, { platform: "x", url: "https://a.co" }])).toHaveLength(1);
  });
});
