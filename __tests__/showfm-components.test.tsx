import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
// The real package registers custom elements; the markup under test doesn't need that.
vi.mock("@showfm/embed", () => ({}));
import { PLAYER_MIN_HEIGHTS } from "@showfm/embed/server";
import { ShowfmPlayer } from "@/components/podcast/showfm-player";
import { ShowfmTranscript } from "@/components/podcast/showfm-transcript";
import { SHOWFM_UUID, showfmEpisode } from "./helpers/showfm-episode";

const player = (props: Partial<Parameters<typeof ShowfmPlayer>[0]> = {}) =>
  renderToStaticMarkup(<ShowfmPlayer episode={showfmEpisode} {...props} />);
const openTag = (html: string) => /<showfm-(?:player|transcript)[^>]*>/.exec(html)![0];

describe("ShowfmPlayer", () => {
  it("renders the element with the episode UUID and the standard reserved height", () => {
    const tag = openTag(player());
    expect(tag).toContain(`episode="${SHOWFM_UUID}"`);
    expect(tag).toContain(`display:block;min-height:${PLAYER_MIN_HEIGHTS.standard.branded}px`);
  });

  it("reserves the compact height for the compact size", () => {
    const tag = openTag(player({ size: "compact" }));
    expect(tag).toContain('size="compact"');
    expect(tag).toContain(`min-height:${PLAYER_MIN_HEIGHTS.compact.branded}px`);
  });

  it("omits every optional attribute when following the show", () => {
    const tag = openTag(player({ theme: "follow-show", accent: "", transcript: "none", headingLevel: "none", miniPlayer: undefined }));
    for (const a of ["size=", "theme=", "accent=", "transcript=", "heading-level=", "mini-player=", "wave=", "credit="]) {
      expect(tag).not.toContain(a);
    }
  });

  it("maps props to attributes", () => {
    const tag = openTag(
      player({ transcript: "open", theme: "light", accent: "#0ea5e9", wave: true, miniPlayer: "on", headingLevel: "3", credit: "on" }),
    );
    expect(tag).toContain('transcript="open"');
    expect(tag).toContain('theme="light"');
    expect(tag).toContain('accent="#0ea5e9"');
    expect(tag).toContain('wave="true"');
    expect(tag).toContain('mini-player="on"');
    expect(tag).toContain('heading-level="3"');
    expect(tag).toContain('credit="on"');
  });

  it("never emits an unvalidated accent", () => {
    const html = player({ accent: 'red;background:url(x)" onload="x' });
    expect(html).not.toContain("accent=");
    expect(html).not.toContain("onload");
  });

  it("server HTML has the documented fallback: listen link and a lazy <audio>", () => {
    const html = player();
    expect(html).toContain('<a href="https://show.fm/community-code/e/episode-36">');
    expect(html).toContain("Episode 36: Jacquie Capur");
    expect(html).toContain('<audio controls="" preload="none" src="https://m.cdn.media/ep/36.mp3">');
  });

  it("omits the link or audio from the fallback when the episode has none", () => {
    const html = player({ episode: { ...showfmEpisode, links: {}, audio: null } });
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<audio");
  });

  it("drops a javascript: listen link", () => {
    const html = player({ episode: { ...showfmEpisode, links: { listen: "javascript:alert(1)" } } });
    expect(html).not.toContain("javascript:");
  });
});

describe("ShowfmTranscript", () => {
  const html = (props: Partial<Parameters<typeof ShowfmTranscript>[0]> = {}) =>
    renderToStaticMarkup(<ShowfmTranscript episode={showfmEpisode} {...props} />);

  it("follows the episode and reserves the documented 377px by default", () => {
    const tag = openTag(html());
    expect(tag).toContain(`episode="${SHOWFM_UUID}"`);
    expect(tag).toContain("--showfm-height:377px");
    expect(tag).toContain("min-height:var(--showfm-height)");
    expect(tag).not.toContain("height=");
  });

  it("derives the reserved height from the height prop and passes it through", () => {
    const tag = openTag(html({ height: 500 }));
    expect(tag).toContain(' height="500"');
    expect(tag).toContain("--showfm-height:557px");
  });

  it("maps theme, accent and heading level, omitting follow-the-show values", () => {
    const tag = openTag(html({ theme: "dark", accent: "#fff", headingLevel: "2" }));
    for (const a of ['theme="dark"', 'accent="#fff"', 'heading-level="2"']) expect(tag).toContain(a);
    const quiet = openTag(html({ theme: "follow-show", accent: "nope", headingLevel: "none" }));
    expect(quiet).not.toMatch(/ (theme|accent|heading-level)=/);
  });

  it("server HTML has a fallback link to the transcript file", () => {
    expect(html()).toContain('<a href="https://m.cdn.media/ep/36.vtt">Read the transcript of Episode 36: Jacquie Capur</a>');
    expect(html({ episode: { ...showfmEpisode, transcript: null } })).not.toContain("<a ");
  });
});
