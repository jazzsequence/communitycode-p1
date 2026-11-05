// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
// Custom-element registration is the package's job, not under test here.
vi.mock("@showfm/embed", () => ({}));
import { PLAYER_MIN_HEIGHTS } from "@showfm/embed/server";
import { episodePlayerBlock } from "@/components/puck/podcast/episode-player";
import { transcriptViewerBlock } from "@/components/puck/podcast/transcript-viewer";
import { toCard } from "@/lib/episodes/dto";
import { installMediaMock } from "./helpers/media";
import { SHOWFM_UUID, showfmEpisode, wordpressEpisode } from "./helpers/showfm-episode";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
let fetchMock: ReturnType<typeof vi.fn>;

/** Serve one episode for any episode lookup and cues for the transcript endpoint. */
function serve(episode: typeof showfmEpisode) {
  fetchMock.mockImplementation(async (url: string) =>
    /\/transcript/.test(url)
      ? json({ cues: [{ start: 0, end: 2, text: "Native transcript line." }] })
      : json({ episode: toCard(episode), episodes: [toCard(episode)] }),
  );
}

beforeAll(() => installMediaMock(2608));
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const nativePlayer = () => screen.findByRole("group", { name: /Audio player:/ });

describe("EpisodePlayer block: playerMode", () => {
  it("defaults to auto and exposes the show.fm options with follow-the-show defaults", () => {
    expect(episodePlayerBlock.defaultProps).toMatchObject({
      playerMode: "auto",
      size: "standard",
      transcript: "none",
      theme: "follow-show",
      accent: "",
      miniPlayer: "off",
      headingLevel: "none",
    });
    for (const k of ["playerMode", "size", "transcript", "theme", "accent", "miniPlayer", "headingLevel"] as const) {
      expect(episodePlayerBlock.fields[k]).toBeDefined();
    }
  });

  it("auto: a show.fm-hosted episode renders <showfm-player> with its fallback and no native player", async () => {
    serve(showfmEpisode);
    const { container } = render(episodePlayerBlock.render({ episodeSlug: "s", playerMode: "auto" }));
    await waitFor(() => expect(container.querySelector("showfm-player")).not.toBeNull());
    const el = container.querySelector("showfm-player")!;
    expect(el.getAttribute("episode")).toBe(SHOWFM_UUID);
    expect((el as HTMLElement).style.minHeight).toBe(`${PLAYER_MIN_HEIGHTS.standard.branded}px`);
    expect(el.querySelector("audio")?.getAttribute("src")).toBe(showfmEpisode.audio!.url);
    expect(el.querySelector("a")?.getAttribute("href")).toBe(showfmEpisode.links.listen);
    expect(screen.queryByRole("group", { name: /Audio player:/ })).toBeNull();
  });

  it("auto is also what a block saved before playerMode existed gets", async () => {
    serve(showfmEpisode);
    const { container } = render(episodePlayerBlock.render({ episodeSlug: "s" }));
    await waitFor(() => expect(container.querySelector("showfm-player")).not.toBeNull());
  });

  it("auto: a WordPress-only episode keeps the native player", async () => {
    serve(wordpressEpisode);
    const { container } = render(episodePlayerBlock.render({ episodeSlug: "s", playerMode: "auto" }));
    await nativePlayer();
    expect(container.querySelector("showfm-player")).toBeNull();
  });

  it("auto: a show.fm episode whose audio is NOT on a show.fm host falls back to native", async () => {
    serve({ ...showfmEpisode, audio: { ...showfmEpisode.audio!, url: "https://wp.example.test/a.mp3" } });
    const { container } = render(episodePlayerBlock.render({ episodeSlug: "s", playerMode: "auto" }));
    await nativePlayer();
    expect(container.querySelector("showfm-player")).toBeNull();
  });

  it("native: never uses show.fm, even for a show.fm episode", async () => {
    serve(showfmEpisode);
    const { container } = render(episodePlayerBlock.render({ episodeSlug: "s", playerMode: "native" }));
    await nativePlayer();
    expect(container.querySelector("showfm-player")).toBeNull();
  });

  it("showfm: forces the embed (even with audio off-host) when there is a UUID and audio", async () => {
    serve({ ...showfmEpisode, audio: { ...showfmEpisode.audio!, url: "https://wp.example.test/a.mp3" } });
    const { container } = render(episodePlayerBlock.render({ episodeSlug: "s", playerMode: "showfm" }));
    await waitFor(() => expect(container.querySelector("showfm-player")).not.toBeNull());
  });

  it("showfm: falls back to native when the id is not a UUID, rather than rendering a dead element", async () => {
    serve(wordpressEpisode);
    const { container } = render(episodePlayerBlock.render({ episodeSlug: "s", playerMode: "showfm" }));
    await nativePlayer();
    expect(container.querySelector("showfm-player")).toBeNull();
  });

  it("showfm: with no audio it says so instead of rendering an element", async () => {
    serve({ ...showfmEpisode, audio: null });
    const { container } = render(episodePlayerBlock.render({ episodeSlug: "s", playerMode: "showfm" }));
    expect(await screen.findByText(/no audio for this episode/i)).toBeTruthy();
    expect(container.querySelector("showfm-player")).toBeNull();
  });

  it("passes the editor options through to the element and validates the accent", async () => {
    serve(showfmEpisode);
    const { container } = render(
      episodePlayerBlock.render({
        episodeSlug: "s",
        size: "compact",
        theme: "dark",
        accent: "#0ea5e9",
        miniPlayer: "on",
        headingLevel: "2",
      }),
    );
    await waitFor(() => expect(container.querySelector("showfm-player")).not.toBeNull());
    const el = container.querySelector("showfm-player")!;
    expect(el.getAttribute("size")).toBe("compact");
    expect(el.getAttribute("theme")).toBe("dark");
    expect(el.getAttribute("accent")).toBe("#0ea5e9");
    expect(el.getAttribute("mini-player")).toBe("on");
    expect(el.getAttribute("heading-level")).toBe("2");
    expect((el as HTMLElement).style.minHeight).toBe(`${PLAYER_MIN_HEIGHTS.compact.branded}px`);
  });

  it("still fetches the configured endpoints (nothing hardcoded)", async () => {
    serve(showfmEpisode);
    render(episodePlayerBlock.render({ episodeSlug: "s", episodeEndpoint: "https://api.example.test/eps/{slug}.json" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/eps/s.json");
  });
});

describe("TranscriptViewer block: source", () => {
  it("defaults to auto with the show.fm options following the show", () => {
    expect(transcriptViewerBlock.defaultProps).toMatchObject({ source: "auto", height: 320, theme: "follow-show", accent: "", headingLevel: "none" });
    expect(Object.keys(transcriptViewerBlock.fields)).toEqual(
      expect.arrayContaining(["episodeSlug", "showSearch", "transcriptEndpoint", "episodeEndpoint", "episodesEndpoint", "source"]),
    );
  });

  it("auto: show.fm's transcript for a show.fm episode with both files on show.fm", async () => {
    serve(showfmEpisode);
    const { container } = render(transcriptViewerBlock.render({ episodeSlug: "s", source: "auto" }));
    await waitFor(() => expect(container.querySelector("showfm-transcript")).not.toBeNull());
    const el = container.querySelector("showfm-transcript")!;
    expect(el.getAttribute("episode")).toBe(SHOWFM_UUID);
    expect(el.getAttribute("height")).toBeNull();
    expect((el as HTMLElement).style.minHeight).toBe("var(--showfm-height)");
    expect(el.querySelector("a")?.getAttribute("href")).toBe(showfmEpisode.transcript!.url);
    // The native viewer's transcript endpoint is never hit.
    expect(fetchMock.mock.calls.some(([u]) => /\/transcript/.test(u))).toBe(false);
  });

  it("auto: the native viewer (with its search) for a WordPress episode", async () => {
    serve(wordpressEpisode);
    const { container } = render(transcriptViewerBlock.render({ episodeSlug: "s", source: "auto" }));
    await screen.findByText("Native transcript line.");
    expect(container.querySelector("showfm-transcript")).toBeNull();
    expect(screen.getByRole("searchbox")).toBeTruthy();
  });

  it("auto: native when the transcript file is not on show.fm's host", async () => {
    serve({ ...showfmEpisode, transcript: { url: "https://wp.example.test/t.vtt", type: "text/vtt" } });
    const { container } = render(transcriptViewerBlock.render({ episodeSlug: "s", source: "auto" }));
    await screen.findByText("Native transcript line.");
    expect(container.querySelector("showfm-transcript")).toBeNull();
  });

  it("native: never uses show.fm", async () => {
    serve(showfmEpisode);
    const { container } = render(transcriptViewerBlock.render({ episodeSlug: "s", source: "native" }));
    await screen.findByText("Native transcript line.");
    expect(container.querySelector("showfm-transcript")).toBeNull();
  });

  it("showfm: forces the embed with a UUID and a transcript; falls back to native without a UUID", async () => {
    serve({ ...showfmEpisode, transcript: { url: "https://wp.example.test/t.vtt", type: "text/vtt" } });
    const forced = render(transcriptViewerBlock.render({ episodeSlug: "s", source: "showfm", height: 500 }));
    await waitFor(() => expect(forced.container.querySelector("showfm-transcript")).not.toBeNull());
    expect(forced.container.querySelector("showfm-transcript")!.getAttribute("height")).toBe("500");
    forced.unmount();

    serve(wordpressEpisode);
    const fallback = render(transcriptViewerBlock.render({ episodeSlug: "s", source: "showfm" }));
    await screen.findByText("Native transcript line.");
    expect(fallback.container.querySelector("showfm-transcript")).toBeNull();
  });

  it("says so when the episode has no transcript, whichever source is chosen", async () => {
    serve({ ...showfmEpisode, transcript: null });
    render(transcriptViewerBlock.render({ episodeSlug: "s", source: "auto" }));
    expect(await screen.findByText(/no transcript for this episode/i)).toBeTruthy();
  });
});
