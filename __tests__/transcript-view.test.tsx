// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "@/components/podcast/audio-player";
import { TranscriptViewer } from "@/components/podcast/transcript-view";
import { episodePlayerBlock } from "@/components/puck/podcast/episode-player";
import { transcriptViewerBlock } from "@/components/puck/podcast/transcript-viewer";
import { DEFAULT_ENDPOINTS } from "@/lib/block-config";
import type { Cue } from "@/lib/transcript";
import { installMediaMock, playSpy } from "./helpers/media";

// Cue starts are far enough apart (and A/B end in a full stop) that each lands in its own paragraph.
const CUES: Cue[] = [
  { start: 0, end: 3, text: "Welcome to the show." },
  { start: 25, end: 28, text: "We talk about abc and a.c today." },
  { start: 62, end: 65, text: "Banana bread (the recipe)." },
];

let fetchMock: ReturnType<typeof vi.fn>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeAll(() => installMediaMock(2608));
beforeEach(() => {
  playSpy.mockClear();
  fetchMock = vi.fn(async () => json({ cues: CUES }));
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

const rows = () => within(screen.getByRole("list", { name: "Transcript" })).getAllByRole("listitem");

describe("TranscriptViewer", () => {
  it("shows loading, then paragraphs with timestamps", async () => {
    render(<TranscriptViewer slug="tv-1" />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
    await screen.findByRole("list", { name: "Transcript" });
    expect(fetchMock).toHaveBeenCalledWith(DEFAULT_ENDPOINTS.transcript.replace("{slug}", "tv-1"), expect.anything());
    expect(rows()).toHaveLength(3);
    expect(screen.getByText("1:02")).toBeTruthy();
  });

  it("without a player: timestamps are plain text and there is no follow toggle", async () => {
    render(<TranscriptViewer slug="tv-2" />);
    await screen.findByRole("list", { name: "Transcript" });
    expect(screen.queryByRole("button", { name: /Play from/ })).toBeNull();
    expect(screen.queryByLabelText("Follow along")).toBeNull();
  });

  it("shows the empty state on 404", async () => {
    fetchMock.mockResolvedValue(json({ error: "No transcript" }, 404));
    render(<TranscriptViewer slug="tv-3" />);
    expect(await screen.findByText(/no transcript for this episode/i)).toBeTruthy();
  });

  it("shows the empty state for zero cues", async () => {
    fetchMock.mockResolvedValue(json({ cues: [] }));
    render(<TranscriptViewer slug="tv-3b" />);
    expect(await screen.findByText(/no transcript for this episode/i)).toBeTruthy();
  });

  it("shows an error with a working retry", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "x" }, 502));
    render(<TranscriptViewer slug="tv-4" />);
    expect((await screen.findByRole("alert")).textContent).toContain("could not be loaded");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("list", { name: "Transcript" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows an error when the network fails", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    render(<TranscriptViewer slug="tv-4b" />);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("renders hostile cue text as text, never markup", async () => {
    fetchMock.mockResolvedValue(
      json({ cues: [{ start: 0, end: 2, text: '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>', speaker: "<b>Eve</b>" }] }),
    );
    const { container } = render(<TranscriptViewer slug="tv-5" />);
    await screen.findByRole("list", { name: "Transcript" });
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  describe("with a player on the page", () => {
    function setup() {
      const utils = render(
        <>
          <AudioPlayer src="https://example.test/a.mp3" title="Ep" channelKey="tv-p" durationHint={2608} />
          <TranscriptViewer slug="tv-p" />
        </>,
      );
      return { ...utils, audio: utils.container.querySelector("audio") as HTMLAudioElement };
    }

    it("clicking a timestamp seeks the player and plays", async () => {
      const { audio } = setup();
      await screen.findByRole("list", { name: "Transcript" });
      await userEvent.click(screen.getByRole("button", { name: "Play from 0:25" }));
      expect(audio.currentTime).toBe(25);
      expect(playSpy).toHaveBeenCalled();
    });

    it("marks the active paragraph with aria-current as playback advances", async () => {
      const { audio } = setup();
      await screen.findByRole("list", { name: "Transcript" });
      expect(rows().some((r) => r.getAttribute("aria-current"))).toBe(false);
      audio.currentTime = 30;
      fireEvent.timeUpdate(audio);
      await waitFor(() => expect(rows()[1].getAttribute("aria-current")).toBe("true"));
      expect(rows()[0].getAttribute("aria-current")).toBeNull();
      audio.currentTime = 63;
      fireEvent.timeUpdate(audio);
      await waitFor(() => expect(rows()[2].getAttribute("aria-current")).toBe("true"));
      expect(rows()[1].getAttribute("aria-current")).toBeNull();
    });

    it("only scrolls when Follow along is on (off by default)", async () => {
      const { audio } = setup();
      await screen.findByRole("list", { name: "Transcript" });
      const toggle = screen.getByLabelText("Follow along") as HTMLInputElement;
      expect(toggle.checked).toBe(false);

      audio.currentTime = 30;
      fireEvent.timeUpdate(audio);
      await waitFor(() => expect(rows()[1].getAttribute("aria-current")).toBe("true"));
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

      await userEvent.click(toggle);
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled(); // active row scrolls when enabled
      vi.mocked(Element.prototype.scrollIntoView).mockClear();
      audio.currentTime = 63;
      fireEvent.timeUpdate(audio);
      await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1));
    });

    it("uses instant scrolling when the user prefers reduced motion", async () => {
      vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }));
      window.matchMedia = globalThis.matchMedia;
      const { audio } = setup();
      await screen.findByRole("list", { name: "Transcript" });
      await userEvent.click(screen.getByLabelText("Follow along"));
      audio.currentTime = 30;
      fireEvent.timeUpdate(audio);
      await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" }));
    });
  });

  describe("search", () => {
    async function search(term: string) {
      render(<TranscriptViewer slug="tv-s" />);
      await screen.findByRole("list", { name: "Transcript" });
      await userEvent.type(screen.getByRole("searchbox", { name: "Search the transcript" }), term);
    }

    it("filters paragraphs and highlights matches in <mark>", async () => {
      await search("banana");
      await waitFor(() => expect(rows()).toHaveLength(1));
      const marks = within(rows()[0]).getAllByText("Banana");
      expect(marks[0].tagName).toBe("MARK");
      expect(screen.getByRole("status").textContent).toBe("1 passage matches.");
    });

    it("treats regex metacharacters literally", async () => {
      await search("a.c");
      await waitFor(() => expect(rows()).toHaveLength(1));
      expect(rows()[0].textContent).toContain("abc and a.c");
      expect(within(rows()[0]).getAllByText("a.c")[0].tagName).toBe("MARK");
    });

    it("does not throw on an invalid regex such as '('", async () => {
      await search("(");
      await waitFor(() => expect(rows()).toHaveLength(1));
      expect(rows()[0].textContent).toContain("(the recipe)");
    });

    it("says so when nothing matches, and recovers when cleared", async () => {
      await search("zzzz");
      await waitFor(() => expect(screen.getByRole("status").textContent).toBe("No matches."));
      expect(screen.queryByRole("list", { name: "Transcript" })).toBeNull();
      await userEvent.clear(screen.getByRole("searchbox"));
      await waitFor(() => expect(rows()).toHaveLength(3));
    });

    it("can hide the search box", async () => {
      render(<TranscriptViewer slug="tv-s2" showSearch={false} />);
      await screen.findByRole("list", { name: "Transcript" });
      expect(screen.queryByRole("searchbox")).toBeNull();
    });
  });

  it("handles a few thousand cues", async () => {
    const many: Cue[] = Array.from({ length: 5000 }, (_, i) => ({ start: i * 2, end: i * 2 + 2, text: `fragment ${i}${i % 7 === 6 ? "." : ""}` }));
    fetchMock.mockResolvedValue(json({ cues: many }));
    const t = performance.now();
    render(<TranscriptViewer slug="tv-big" />);
    await screen.findByRole("list", { name: "Transcript" });
    expect(rows().length).toBeLessThan(1000); // grouped into paragraphs, not 5000 rows
    expect(performance.now() - t).toBeLessThan(5000);
  });
});

describe("Puck blocks", () => {
  const episode = (over: object = {}) => ({
    slug: "latest-ep",
    title: "Latest",
    durationSeconds: 100,
    audio: { url: "https://example.test/l.mp3", contentType: "audio/mpeg", sizeBytes: 1 },
    transcript: { url: "https://communitycode.dev/x.vtt", type: "text/vtt" },
    links: { youtube: "https://youtu.be/x" },
    ...over,
  });

  it("exposes every endpoint as a text field, defaulted from lib/block-config.ts", () => {
    // The original fields keep their ids and order; the show.fm options are appended.
    expect(Object.keys(episodePlayerBlock.fields).slice(0, 3)).toEqual(["episodeSlug", "episodeEndpoint", "episodesEndpoint"]);
    expect(Object.keys(transcriptViewerBlock.fields).slice(0, 5)).toEqual([
      "episodeSlug",
      "showSearch",
      "transcriptEndpoint",
      "episodeEndpoint",
      "episodesEndpoint",
    ]);
    expect(episodePlayerBlock.defaultProps).toMatchObject({
      episodeSlug: "",
      episodeEndpoint: DEFAULT_ENDPOINTS.episode,
      episodesEndpoint: DEFAULT_ENDPOINTS.episodes,
    });
    expect(transcriptViewerBlock.defaultProps).toMatchObject({
      showSearch: true,
      transcriptEndpoint: DEFAULT_ENDPOINTS.transcript,
    });
    for (const f of [...Object.values(episodePlayerBlock.fields), ...Object.values(transcriptViewerBlock.fields)]) {
      expect(["text", "radio", "select", "number"]).toContain(f.type);
    }
    for (const k of ["episodeEndpoint", "episodesEndpoint"] as const) expect(episodePlayerBlock.fields[k].type).toBe("text");
  });

  it("renders with no props at all (defaults are merged inside render)", async () => {
    fetchMock.mockResolvedValue(json({ episodes: [episode()] }));
    render(episodePlayerBlock.render({}));
    await screen.findByRole("group", { name: "Audio player: Latest" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes?limit=1&type=full");
  });

  it("player: fetches the custom endpoints it was configured with", async () => {
    fetchMock.mockResolvedValue(json({ episode: episode({ slug: "chosen", title: "Chosen" }) }));
    const { unmount } = render(
      episodePlayerBlock.render({ episodeSlug: "chosen", episodeEndpoint: "https://api.example.test/shows/x/eps/{slug}.json" }),
    );
    await screen.findByRole("group", { name: "Audio player: Chosen" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/shows/x/eps/chosen.json");
    unmount();

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(json({ episodes: [episode()] }));
    render(episodePlayerBlock.render({ episodeSlug: "", episodesEndpoint: "/custom/list?show=1" }));
    await screen.findByRole("group", { name: "Audio player: Latest" });
    expect(fetchMock.mock.calls[0][0]).toBe("/custom/list?show=1&limit=1&type=full");
  });

  it.each(["javascript:alert(1)", "//evil.example/api", "data:text/plain,x", "api/relative", "   "])(
    "player: an unsafe endpoint %j falls back to the default",
    async (bad) => {
      fetchMock.mockResolvedValue(json({ episode: episode({ slug: "s", title: "S" }) }));
      render(episodePlayerBlock.render({ episodeSlug: "s", episodeEndpoint: bad }));
      await screen.findByRole("group", { name: "Audio player: S" });
      expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes/s");
    },
  );

  it("transcript: fetches the custom transcript endpoint with {slug} expanded and encoded", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/episodes") ? json({ episodes: [episode()] }) : json({ cues: CUES }),
    );
    render(transcriptViewerBlock.render({ transcriptEndpoint: "https://t.example.test/{slug}/cues" }));
    await screen.findByRole("list", { name: "Transcript" });
    expect(fetchMock.mock.calls.map((c) => c[0])).toContain("https://t.example.test/latest-ep/cues");
  });

  it("transcript: an unsafe transcript endpoint falls back to the default", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/episodes?") ? json({ episodes: [episode()] }) : json({ cues: CUES }),
    );
    render(transcriptViewerBlock.render({ transcriptEndpoint: "javascript:alert(1)" }));
    await screen.findByRole("list", { name: "Transcript" });
    expect(fetchMock.mock.calls.map((c) => c[0])).toContain("/api/episodes/latest-ep/transcript");
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).not.toContain("javascript:alert(1)");
  });

  it("player: an empty slug fetches the latest full episode", async () => {
    fetchMock.mockResolvedValue(json({ episodes: [episode()] }));
    render(episodePlayerBlock.render({ episodeSlug: "" }));
    await screen.findByRole("group", { name: "Audio player: Latest" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes?limit=1&type=full");
    expect(screen.getByRole("link", { name: /Watch on YouTube/ })).toBeTruthy();
  });

  it("player: a slug fetches that episode", async () => {
    fetchMock.mockResolvedValue(json({ episode: episode({ slug: "chosen", title: "Chosen" }) }));
    render(episodePlayerBlock.render({ episodeSlug: "chosen" }));
    await screen.findByRole("group", { name: "Audio player: Chosen" });
    expect(fetchMock.mock.calls[0][0]).toBe(DEFAULT_ENDPOINTS.episode.replace("{slug}", "chosen"));
  });

  it("player: falls back to a clear message when there is no audio", async () => {
    fetchMock.mockResolvedValue(json({ episodes: [episode({ audio: null })] }));
    render(episodePlayerBlock.render({ episodeSlug: "" }));
    expect(await screen.findByText(/no audio for this episode/i)).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("player: unknown episode and API failure are reported", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "Not found" }, 404));
    const { unmount } = render(episodePlayerBlock.render({ episodeSlug: "nope" }));
    expect(await screen.findByText(/could not be found/i)).toBeTruthy();
    unmount();
    fetchMock.mockResolvedValueOnce(json({}, 502));
    render(episodePlayerBlock.render({ episodeSlug: "" }));
    expect(await screen.findByText(/temporarily unavailable/i)).toBeTruthy();
  });

  it("player: rejects a malformed slug without calling the API", async () => {
    render(episodePlayerBlock.render({ episodeSlug: "../x" }));
    expect(await screen.findByText(/could not be found/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("transcript block + player block for the latest episode pair up on one page", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/episodes?") ? json({ episodes: [episode()] }) : json({ cues: CUES }),
    );
    const { container } = render(
      <>
        {episodePlayerBlock.render({ episodeSlug: "" })}
        {transcriptViewerBlock.render({ episodeSlug: "", showSearch: true })}
      </>,
    );
    await screen.findByRole("list", { name: "Transcript" });
    await userEvent.click(await screen.findByRole("button", { name: "Play from 0:25" }));
    expect((container.querySelector("audio") as HTMLAudioElement).currentTime).toBe(25);
  });

  it("transcript block: says so when the episode has no transcript", async () => {
    fetchMock.mockResolvedValue(json({ episodes: [episode({ transcript: null })] }));
    render(transcriptViewerBlock.render({ episodeSlug: "", showSearch: true }));
    expect(await screen.findByText(/no transcript for this episode/i)).toBeTruthy();
  });
});
