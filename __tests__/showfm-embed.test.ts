import { describe, expect, it } from "vitest";
// Deliberately NOT mocked: the package's real vendor rules and height contract.
import { PLAYER_MIN_HEIGHTS, canOfferTranscript, isShowfmMediaUrl } from "@showfm/embed/server";
import {
  canOfferShowfmTranscript,
  clampTranscriptHeight,
  embedMode,
  isShowfmHosted,
  playerAttributes,
  playerMinHeight,
  safeAccent,
  shouldUseShowfmPlayer,
  shouldUseShowfmTranscript,
  transcriptMinHeight,
} from "@/lib/showfm-embed";
import { SHOWFM_UUID, showfmEpisode, wordpressEpisode } from "./helpers/showfm-episode";

describe("vendor rules the helpers lean on (real package)", () => {
  it("knows show.fm media hosts and the height contract", () => {
    expect(isShowfmMediaUrl("https://m.cdn.media/a.mp3")).toBe(true);
    expect(isShowfmMediaUrl("https://wp.example.test/a.mp3")).toBe(false);
    expect(canOfferTranscript("https://m.cdn.media/a.mp3", "https://wp.example.test/t.vtt")).toBe(false);
    expect(PLAYER_MIN_HEIGHTS.standard.branded).toBeGreaterThan(PLAYER_MIN_HEIGHTS.compact.branded);
  });

  it("playerMinHeight is the vendor's value for each size, not a copy", () => {
    expect(playerMinHeight("standard")).toBe(PLAYER_MIN_HEIGHTS.standard.branded);
    expect(playerMinHeight("compact")).toBe(PLAYER_MIN_HEIGHTS.compact.branded);
  });
});

describe("isShowfmHosted", () => {
  it("is true for a show.fm episode with a UUID id and audio on show.fm's CDN", () => {
    expect(isShowfmHosted(showfmEpisode)).toBe(true);
  });
  it("is false for a WordPress-only episode", () => {
    expect(isShowfmHosted(wordpressEpisode)).toBe(false);
  });
  it("is false when the audio is not on a show.fm host, even for a show.fm episode", () => {
    expect(isShowfmHosted({ ...showfmEpisode, audio: { ...showfmEpisode.audio!, url: "https://wp.example.test/a.mp3" } })).toBe(false);
  });
  it("is false without audio, without a UUID, or without an episode", () => {
    expect(isShowfmHosted({ ...showfmEpisode, audio: null })).toBe(false);
    expect(isShowfmHosted({ ...showfmEpisode, id: "wp-9" })).toBe(false);
    expect(isShowfmHosted({ ...showfmEpisode, id: `${SHOWFM_UUID}x` })).toBe(false);
    expect(isShowfmHosted(null)).toBe(false);
  });
  it("requires origin showfm even when the id and audio look right", () => {
    expect(isShowfmHosted({ ...showfmEpisode, origin: "wordpress" })).toBe(false);
  });
});

describe("canOfferShowfmTranscript", () => {
  it("needs audio and transcript both on show.fm media hosts", () => {
    expect(canOfferShowfmTranscript(showfmEpisode)).toBe(true);
    expect(canOfferShowfmTranscript({ ...showfmEpisode, transcript: { url: "https://wp.example.test/t.vtt", type: "text/vtt" } })).toBe(false);
    expect(canOfferShowfmTranscript({ ...showfmEpisode, transcript: null })).toBe(false);
    expect(canOfferShowfmTranscript({ ...showfmEpisode, audio: null })).toBe(false);
  });
  it("needs a show.fm UUID", () => {
    expect(canOfferShowfmTranscript({ ...showfmEpisode, id: "wp-1" })).toBe(false);
    expect(canOfferShowfmTranscript(wordpressEpisode)).toBe(false);
  });
});

describe("mode selection", () => {
  it("embedMode treats unknown or missing values as auto", () => {
    expect(embedMode(undefined)).toBe("auto");
    expect(embedMode("bogus")).toBe("auto");
    expect(embedMode("native")).toBe("native");
  });
  it("player: auto follows hosting, native never, showfm needs a UUID and audio", () => {
    expect(shouldUseShowfmPlayer(showfmEpisode, "auto")).toBe(true);
    expect(shouldUseShowfmPlayer(showfmEpisode, undefined)).toBe(true);
    expect(shouldUseShowfmPlayer(wordpressEpisode, "auto")).toBe(false);
    expect(shouldUseShowfmPlayer(showfmEpisode, "native")).toBe(false);
    expect(shouldUseShowfmPlayer(wordpressEpisode, "showfm")).toBe(false); // "wp-123" is not a UUID
    expect(shouldUseShowfmPlayer({ ...wordpressEpisode, id: SHOWFM_UUID }, "showfm")).toBe(true);
    expect(shouldUseShowfmPlayer({ ...showfmEpisode, audio: null }, "showfm")).toBe(false);
  });
  it("transcript: auto follows canOfferShowfmTranscript, showfm needs a UUID and a transcript", () => {
    expect(shouldUseShowfmTranscript(showfmEpisode, "auto")).toBe(true);
    expect(shouldUseShowfmTranscript(wordpressEpisode, "auto")).toBe(false);
    expect(shouldUseShowfmTranscript(showfmEpisode, "native")).toBe(false);
    expect(shouldUseShowfmTranscript({ ...showfmEpisode, transcript: null }, "showfm")).toBe(false);
    expect(shouldUseShowfmTranscript({ ...showfmEpisode, id: "wp-1" }, "showfm")).toBe(false);
    expect(shouldUseShowfmTranscript({ ...wordpressEpisode, id: SHOWFM_UUID }, "showfm")).toBe(true);
  });
});

describe("safeAccent", () => {
  it.each([["#0ea5e9", "#0ea5e9"], ["#ABC", "#ABC"], ["0ea5e9", "#0ea5e9"], ["  #fff ", "#fff"]])("accepts %j", (input, out) => {
    expect(safeAccent(input)).toBe(out);
  });
  it.each(["red", "red;background:url(x)", "#12", "#12345", "#gggggg", "#0ea5e9;x", '#fff" onload="x', "", "   ", undefined, 5])(
    "rejects %j",
    (input) => {
      expect(safeAccent(input)).toBeUndefined();
    },
  );
});

describe("playerAttributes", () => {
  it("omits everything when the options mean follow the show", () => {
    expect(playerAttributes({})).toEqual({});
    expect(
      playerAttributes({ size: "standard", transcript: "none", theme: "follow-show", accent: "", miniPlayer: "", headingLevel: "none", credit: "auto" }),
    ).toEqual({});
  });
  it("maps each option to its attribute", () => {
    expect(
      playerAttributes({ size: "compact", theme: "dark", accent: "#0ea5e9", wave: false, miniPlayer: "on", headingLevel: "3", credit: "off" }),
    ).toEqual({ size: "compact", theme: "dark", accent: "#0ea5e9", wave: "false", "mini-player": "on", "heading-level": "3", credit: "off" });
    expect(playerAttributes({ transcript: "reader", wave: true, headingLevel: 2 })).toEqual({ transcript: "reader", wave: "true", "heading-level": "2" });
  });
  it("drops values outside the allowed sets and a hostile accent", () => {
    expect(
      playerAttributes({ size: "huge", transcript: "x", theme: "neon", accent: "red;background:url(x)", miniPlayer: "yes", headingLevel: "1", credit: "maybe" }),
    ).toEqual({});
    expect(playerAttributes({ headingLevel: "7" })).toEqual({});
  });
  it("does not ask the compact player for a transcript (it has none)", () => {
    expect(playerAttributes({ size: "compact", transcript: "on" })).toEqual({ size: "compact" });
  });
});

describe("transcript height", () => {
  it("is the text area plus the search row and border, and is clamped to the element's range", () => {
    expect(transcriptMinHeight(undefined)).toBe(377);
    expect(transcriptMinHeight(500)).toBe(557);
    expect(clampTranscriptHeight(10)).toBe(120);
    expect(clampTranscriptHeight(99999)).toBe(2000);
    expect(clampTranscriptHeight("abc")).toBe(320);
    expect(clampTranscriptHeight("400")).toBe(400);
  });
});
