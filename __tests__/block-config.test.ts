import { describe, expect, it } from "vitest";
import { expandTemplate, safeUrl, withQuery } from "@/lib/block-config";

describe("safeUrl", () => {
  it("keeps same-origin paths and http(s) URLs", () => {
    expect(safeUrl("/api/episodes", "/x")).toBe("/api/episodes");
    expect(safeUrl("  https://example.org/a?b=1 ", "/x")).toBe("https://example.org/a?b=1");
  });
  it.each(["", "   ", null, undefined, 5, "//evil.example", "javascript:alert(1)", "data:text/html,x", "/a\\b", "/a\nb", "ftp://x", "relative/path", "https://"])(
    "falls back for %j",
    (v) => {
      expect(safeUrl(v, "/fallback")).toBe("/fallback");
    },
  );
});

describe("expandTemplate", () => {
  it("expands and URL-encodes placeholders", () => {
    expect(expandTemplate("/episodes/{slug}", { slug: "episode-36" })).toBe("/episodes/episode-36");
    expect(expandTemplate("/s{season}/e{number}", { season: 2, number: 36 })).toBe("/s2/e36");
    expect(expandTemplate("/e/{slug}", { slug: "../../etc?x=1#y" })).toBe("/e/..%2F..%2Fetc%3Fx%3D1%23y");
  });
  it("returns null instead of emitting 'undefined' when a value is missing", () => {
    expect(expandTemplate("/episodes/{slug}", { slug: null })).toBeNull();
    expect(expandTemplate("/episodes/{slug}", {})).toBeNull();
    expect(expandTemplate("/episodes/{slug}", { slug: "" })).toBeNull();
  });
  it("leaves a template with no placeholders alone", () => {
    expect(expandTemplate("/episodes", {})).toBe("/episodes");
  });
});

describe("withQuery", () => {
  it("adds params with the right separator and skips empties", () => {
    expect(withQuery("/api/episodes", { limit: 12, season: undefined, q: "" })).toBe("/api/episodes?limit=12");
    expect(withQuery("/api/x?a=1", { b: 2 })).toBe("/api/x?a=1&b=2");
    expect(withQuery("/api/x", {})).toBe("/api/x");
  });
});
