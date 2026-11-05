import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@showfm/embed", () => ({}));
import { PLAYER_MIN_HEIGHTS } from "@showfm/embed/server";
import { EpisodeDetail } from "@/components/podcast/episode-detail";
import { SHOWFM_UUID, showfmEpisode, wordpressEpisode } from "./helpers/showfm-episode";

const html = (e: typeof showfmEpisode) => renderToStaticMarkup(<EpisodeDetail episode={e} />);

describe("EpisodeDetail with show.fm", () => {
  it("renders the show.fm player and transcript, with the fallbacks in the server HTML", () => {
    const out = html(showfmEpisode);
    expect(out).toContain(`<showfm-player episode="${SHOWFM_UUID}"`);
    expect(out).toContain(`min-height:${PLAYER_MIN_HEIGHTS.standard.branded}px`);
    expect(out).toContain('<a href="https://show.fm/community-code/e/episode-36">');
    expect(out).toMatch(/<audio controls="" preload="none" src="https:\/\/m\.cdn\.media\//);
    expect(out).toContain("<showfm-transcript");
    expect(out).toContain("Transcript</h2>");
    // The native widgets are not rendered alongside.
    expect(out).not.toContain('aria-label="Audio player:');
  });

  it("keeps JSON-LD, show notes and the page heading", () => {
    const out = html(showfmEpisode);
    expect(out).toContain('"@type":"PodcastEpisode"');
    expect(out).toContain('class="cc-prose"');
    expect(out).toContain("Episode 36: Jacquie Capur</h1>");
  });

  it("a WordPress-only episode keeps the native player and transcript", () => {
    const out = html(wordpressEpisode);
    expect(out).toContain('aria-label="Audio player:');
    expect(out).not.toContain("<showfm-");
  });

  it("a show.fm episode with audio off show.fm's host keeps the native player", () => {
    const out = html({ ...showfmEpisode, audio: { ...showfmEpisode.audio!, url: "https://wp.example.test/a.mp3" } });
    expect(out).toContain('aria-label="Audio player:');
    expect(out).not.toContain("<showfm-player");
    expect(out).not.toContain("<showfm-transcript"); // the transcript needs show.fm audio too
  });

  it("show.fm player with a transcript that is off-host keeps the native transcript viewer", () => {
    const out = html({ ...showfmEpisode, transcript: { url: "https://wp.example.test/t.vtt", type: "text/vtt" } });
    expect(out).toContain("<showfm-player");
    expect(out).not.toContain("<showfm-transcript");
    expect(out).toContain("Transcript</h2>");
  });
});
