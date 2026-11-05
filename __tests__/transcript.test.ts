import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  activeCueIndex,
  blockMatches,
  buildMatcher,
  groupCues,
  highlightBlock,
  isSameHost,
  parseTimestamp,
  parseTranscriptUrl,
  parseVtt,
  type Cue,
} from "@/lib/transcript";
import { isAllowedTranscriptUrl, loadConfig } from "@/lib/config";

describe("parseTimestamp", () => {
  it.each([
    ["00:00:01.500", 1.5],
    ["01:02:03.004", 3723.004],
    ["02:05.250", 125.25],
    ["00:01.5", 1.5], // short fraction pads right: .5 = 500ms
    ["00:00:01,250", 1.25], // SRT comma
    ["12:34", 754],
  ])("%s", (raw, expected) => {
    expect(parseTimestamp(raw)).toBeCloseTo(expected, 3);
  });

  it.each(["", "abc", "1", "00:61.000", "00:00:75.000", "00:99:00.000", "00:00:01.12345", "-00:01.000"])(
    "rejects %j",
    (raw) => {
      expect(parseTimestamp(raw)).toBeNull();
    },
  );
});

describe("parseVtt", () => {
  it("parses a basic file", () => {
    const cues = parseVtt("WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello\n\n00:00:02.000 --> 00:00:04.500\nWorld\n");
    expect(cues).toEqual([
      { start: 0, end: 2, text: "Hello" },
      { start: 2, end: 4.5, text: "World" },
    ]);
  });

  it("handles CRLF and lone CR line endings and a BOM", () => {
    const crlf = "﻿WEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\nA\r\nB\r\n\r\n00:00:03.000 --> 00:00:04.000\r\nC\r\n";
    expect(parseVtt(crlf).map((c) => c.text)).toEqual(["A B", "C"]);
    expect(parseVtt(crlf.replace(/\r\n/g, "\r")).map((c) => c.text)).toEqual(["A B", "C"]);
  });

  it("ignores cue identifiers, including numeric SRT-style ones", () => {
    const cues = parseVtt("WEBVTT\n\nintro\n00:00:01.000 --> 00:00:02.000\nHi\n\n2\n00:00:02.000 --> 00:00:03.000\nThere\n");
    expect(cues.map((c) => c.text)).toEqual(["Hi", "There"]);
  });

  it("supports MM:SS.mmm timestamps and cue settings after the end time", () => {
    const cues = parseVtt("WEBVTT\n\n00:01.000 --> 00:02.500 align:start position:10%\nShort form\n");
    expect(cues).toEqual([{ start: 1, end: 2.5, text: "Short form" }]);
  });

  it("joins multi-line cues with a space", () => {
    expect(parseVtt("WEBVTT\n\n00:00:00.000 --> 00:00:03.000\nline one\nline two\n  line three  \n")[0].text).toBe(
      "line one line two line three",
    );
  });

  it("skips NOTE, STYLE and REGION blocks", () => {
    const vtt = [
      "WEBVTT",
      "",
      "NOTE this is a comment",
      "00:00:09.000 --> 00:00:09.500",
      "not a cue",
      "",
      "STYLE",
      "::cue { color: red }",
      "",
      "REGION",
      "id:r1",
      "",
      "00:00:01.000 --> 00:00:02.000",
      "real",
    ].join("\n");
    expect(parseVtt(vtt)).toEqual([{ start: 1, end: 2, text: "real" }]);
  });

  it("extracts the speaker from a voice tag and strips the tag from the text", () => {
    const cues = parseVtt(
      "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<v Chris Reynolds>Welcome back</v>\n\n00:00:02.000 --> 00:00:03.000\n<v.loud Jacquie>Thanks!</v>\n",
    );
    expect(cues[0]).toEqual({ start: 1, end: 2, speaker: "Chris Reynolds", text: "Welcome back" });
    expect(cues[1].speaker).toBe("Jacquie");
    expect(cues[1].text).toBe("Thanks!");
  });

  it("strips formatting, class and timestamp tags", () => {
    const cues = parseVtt("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<c.yellow><b>bold</b></c> <i>it</i> <00:00:01.500>alic\n");
    expect(cues[0].text).toBe("bold it alic");
  });

  it("decodes common entities once and keeps the result as plain text", () => {
    const cues = parseVtt("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nCommunity &amp; Code &lt;3 &#39;q&#39; &amp;lt; &nbsp;x\n");
    expect(cues[0].text).toBe("Community & Code <3 'q' &lt; x");
  });

  describe("untrusted input", () => {
    it.each([
      "<img src=x onerror=alert(1)>",
      "<script>alert(1)</script>",
      "<svg/onload=alert(1)>",
      '<a href="javascript:alert(1)">click</a>',
      "<<b>script>alert(1)<</b>/script>",
    ])("no markup survives: %s", (payload) => {
      const cues = parseVtt(`WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nbefore ${payload} after\n`);
      expect(cues).toHaveLength(1);
      expect(cues[0].text).not.toMatch(/<\s*\/?\s*(img|script|svg|a)\b/i);
      expect(cues[0].text).not.toContain("onerror=");
      expect(cues[0].text).toContain("before");
    });

    it("an unclosed tag is stripped to the end of the cue", () => {
      const cues = parseVtt("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nsafe <img src=x onerror=alert(1)\n");
      expect(cues[0].text).toBe("safe");
    });

    it("a cue that is only markup is dropped", () => {
      expect(parseVtt("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<img src=x onerror=alert(1)>\n")).toEqual([]);
    });

    it("entity-encoded markup stays literal text (it is rendered as a text node)", () => {
      const [cue] = parseVtt("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n&lt;img src=x onerror=alert(1)&gt;\n");
      expect(cue.text).toBe("<img src=x onerror=alert(1)>");
    });

    it("strips control characters", () => {
      const [cue] = parseVtt("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\na\u0000b\u0007c\n");
      expect(cue.text).toBe("abc");
    });

    it("caps cue text length", () => {
      const [cue] = parseVtt(`WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n${"x".repeat(10_000)}\n`);
      expect(cue.text.length).toBeLessThanOrEqual(2000);
    });
  });

  describe("malformed input never throws", () => {
    it.each([
      ["empty", ""],
      ["only header", "WEBVTT"],
      ["header and blanks", "WEBVTT\n\n\n\n"],
      ["not a string", undefined as unknown as string],
      ["null", null as unknown as string],
      ["binary-ish", "\u0000\u0001\u0002 --> �"],
      ["HTML challenge page", "<!DOCTYPE html><html><body>Just a moment...</body></html>"],
      ["timing without text", "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n"],
      ["arrow without timestamps", "WEBVTT\n\nfoo --> bar\ntext"],
      ["end before start", "WEBVTT\n\n00:00:05.000 --> 00:00:02.000\nbackwards"],
      ["bad minutes", "WEBVTT\n\n00:99:00.000 --> 00:99:01.000\nbad"],
      ["missing arrow", "WEBVTT\n\n00:00:01.000 00:00:02.000\ntext"],
    ])("%s", (_name, input) => {
      expect(() => parseVtt(input)).not.toThrow();
      expect(parseVtt(input)).toEqual([]);
    });

    it("skips bad cues but keeps good neighbours", () => {
      const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nok one\n\nxx --> yy\nbad\n\n00:00:03.000 --> 00:00:04.000\nok two\n";
      expect(parseVtt(vtt).map((c) => c.text)).toEqual(["ok one", "ok two"]);
    });

    it("tolerates a missing WEBVTT header and a missing blank line after it", () => {
      expect(parseVtt("00:00:01.000 --> 00:00:02.000\nno header")).toHaveLength(1);
      expect(parseVtt("WEBVTT\n00:00:01.000 --> 00:00:02.000\nglued")).toHaveLength(1);
    });

    it("sorts out-of-order cues by start time", () => {
      const cues = parseVtt("WEBVTT\n\n00:00:05.000 --> 00:00:06.000\nlate\n\n00:00:01.000 --> 00:00:02.000\nearly\n");
      expect(cues.map((c) => c.text)).toEqual(["early", "late"]);
    });

    it("stays fast on a large file", () => {
      const body = Array.from({ length: 20_000 }, (_, i) => {
        const s = String(i % 60).padStart(2, "0");
        return `00:${String(Math.floor(i / 60) % 60).padStart(2, "0")}:${s}.000 --> 00:00:59.000\ncue ${i}\n`;
      }).join("\n");
      const t = performance.now();
      parseVtt(`WEBVTT\n\n${body}`);
      expect(performance.now() - t).toBeLessThan(2000);
    });
  });

  it("parses the real communitycode.dev sample (no speaker labels, no tags)", () => {
    const text = readFileSync(new URL("../lib/fixtures/real-transcript-sample.vtt", import.meta.url), "utf8");
    const cues = parseVtt(text);
    expect(cues.length).toBe(30);
    expect(cues[0]).toEqual({ start: 0, end: 2.196, text: "everyone, welcome to Community & Code." });
    expect(cues.some((c) => c.speaker)).toBe(false);
    expect(cues.at(-1)?.text).toBe("Thank you.");
    for (let i = 1; i < cues.length; i++) expect(cues[i].start).toBeGreaterThanOrEqual(cues[i - 1].start);
  });
});

describe("transcript URL guard (parseTranscriptUrl + config allow-list)", () => {
  // The route accepts a URL only if both checks pass; host allow-list is config-driven.
  const hosts = loadConfig({ WP_BASE_URL: "https://wp.example.test", TRANSCRIPT_ALLOWED_HOSTS: "media.example.test" }).transcriptHosts;
  const accepts = (raw: string, base?: string) => {
    const u = parseTranscriptUrl(raw, base);
    return !!u && isAllowedTranscriptUrl(u.toString(), hosts);
  };

  it.each([
    "https://wp.example.test/app/uploads/2026/10/x.vtt",
    "https://WP.EXAMPLE.TEST/x.vtt",
    "https://media.example.test/t.vtt",
    "https://wp.example.test:443/x.vtt",
  ])("allows %s", (url) => {
    expect(accepts(url)).toBe(true);
  });

  it.each([
    "http://169.254.169.254/latest/meta-data/",
    "https://169.254.169.254/",
    "https://evil.example/",
    "https://wp.example.test.evil.example/x.vtt",
    "https://evilwp.example.test/x.vtt",
    "https://evil.example/wp.example.test/x.vtt",
    "https://evil.example/?u=https://wp.example.test/",
    "https://wp.example.test@evil.example/x.vtt",
    "https://user:pw@wp.example.test/x.vtt",
    "https://wp.example.test:8443/x.vtt",
    "http://wp.example.test/x.vtt",
    "ftp://wp.example.test/x.vtt",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "//evil.example/x.vtt",
    "https://localhost/x.vtt",
    "https://[::1]/x.vtt",
    "https://2130706433/x.vtt",
    // Nothing is allowed by default: show.fm needs an explicit TRANSCRIPT_ALLOWED_HOSTS entry.
    "https://cdn.show.fm/x.vtt",
    "",
    "not a url",
  ])("rejects %j", (url) => {
    expect(accepts(url)).toBe(false);
  });

  it("allows nothing when no host is configured", () => {
    const none = loadConfig({}).transcriptHosts;
    const u = parseTranscriptUrl("https://wp.example.test/x.vtt");
    expect(u && isAllowedTranscriptUrl(u.toString(), none)).toBe(false);
  });

  it("resolves a relative URL against the base before the host is checked", () => {
    expect(accepts("/app/uploads/x.vtt", "https://wp.example.test")).toBe(true);
    expect(accepts("/app/uploads/x.vtt", "https://evil.example")).toBe(false);
    expect(accepts("/app/uploads/x.vtt")).toBe(false);
  });

  it("only the WordPress host is treated as same-host (bypass header)", () => {
    expect(isSameHost(new URL("https://wp.example.test/x"), "https://wp.example.test/sub")).toBe(true);
    expect(isSameHost(new URL("https://media.example.test/x"), "https://wp.example.test")).toBe(false);
    expect(isSameHost(new URL("https://wp.example.test/x"), undefined)).toBe(false);
  });
});

const cue = (start: number, text: string, speaker?: string): Cue => ({ start, end: start + 2, text, ...(speaker ? { speaker } : {}) });

describe("activeCueIndex", () => {
  const cues = [cue(0, "a"), cue(5, "b"), cue(10, "c")];
  it.each([
    [-1, -1],
    [0, 0],
    [4.9, 0],
    [5, 1],
    [9.99, 1],
    [10, 2],
    [999, 2],
  ])("t=%s -> %s", (t, expected) => {
    expect(activeCueIndex(cues, t)).toBe(expected);
  });
  it("is -1 for no cues", () => expect(activeCueIndex([], 5)).toBe(-1));
});

describe("groupCues", () => {
  it("groups short fragments into paragraphs after a sentence end past 20s", () => {
    const cues = Array.from({ length: 30 }, (_, i) => cue(i * 2, i % 5 === 4 ? `end ${i}.` : `part ${i}`));
    const blocks = groupCues(cues);
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.length).toBeLessThan(cues.length / 3);
    expect(blocks.flatMap((b) => b.cues)).toHaveLength(30);
    expect(blocks[0].firstIndex).toBe(0);
    expect(blocks[0].lastIndex + 1).toBe(blocks[1].firstIndex);
  });

  it("starts a new block when the speaker changes", () => {
    const blocks = groupCues([cue(0, "hi", "A"), cue(2, "yo", "B"), cue(4, "ok", "B")]);
    expect(blocks.map((b) => [b.speaker, b.cues.length])).toEqual([
      ["A", 1],
      ["B", 2],
    ]);
  });

  it("force-breaks at 45s even without punctuation", () => {
    const cues = Array.from({ length: 40 }, (_, i) => cue(i * 3, `w${i}`));
    expect(groupCues(cues).length).toBeGreaterThan(1);
  });

  it("is empty for no cues", () => expect(groupCues([])).toEqual([]));
});

describe("search helpers", () => {
  const block = groupCues([cue(0, "the quick brown"), cue(2, "fox jumps (over) a.c")])[0];

  it("escapes regex metacharacters in user input", () => {
    expect(() => buildMatcher("(")).not.toThrow();
    expect(() => buildMatcher("[a-")).not.toThrow();
    expect(() => buildMatcher("a**")).not.toThrow();
    expect(blockMatches(block, "(over)")).toBe(true);
    expect(blockMatches(block, "a.c")).toBe(true);
    expect(blockMatches(block, "abc")).toBe(false);
    expect(blockMatches(block, ".*")).toBe(false);
  });

  it("is case-insensitive and empty query matches everything", () => {
    expect(blockMatches(block, "QUICK")).toBe(true);
    expect(blockMatches(block, "   ")).toBe(true);
    expect(buildMatcher("  ")).toBeNull();
  });

  it("finds a phrase split across caption fragments and highlights both halves", () => {
    const segs = highlightBlock(block, "brown fox");
    expect(segs[0].filter((s) => s.match).map((s) => s.text)).toEqual(["brown"]);
    expect(segs[1].filter((s) => s.match).map((s) => s.text)).toEqual(["fox"]);
    expect(segs.flat().map((s) => s.text).join("")).toBe("the quick brownfox jumps (over) a.c");
  });

  it("returns whole-text segments with no query", () => {
    expect(highlightBlock(block, "")).toEqual([[{ text: "the quick brown", match: false }], [{ text: "fox jumps (over) a.c", match: false }]]);
  });

  it("matches the speaker name too", () => {
    const b = groupCues([cue(0, "hello", "Jacquie")])[0];
    expect(blockMatches(b, "jacq")).toBe(true);
  });
});
