import { describe, expect, it } from "vitest";
import { parseListParams } from "@/lib/episodes/params";

const parse = (qs: string) => parseListParams(new URLSearchParams(qs));

describe("parseListParams", () => {
  it("accepts a full valid query", () => {
    expect(parse("season=2&type=full,bonus&limit=20&cursor=abc&q=%20jacquie%20")).toEqual({
      ok: true,
      params: { season: 2, type: ["full", "bonus"], limit: 20, cursor: "abc", query: "jacquie" },
    });
  });

  it("returns empty params for an empty query", () => {
    expect(parse("")).toEqual({ ok: true, params: {} });
  });

  it.each([
    ["season=abc"],
    ["season=-1"],
    ["season=12345"],
    ["type=full,podcast"],
    ["limit=lots"],
    [`cursor=${"x".repeat(513)}`],
  ])("rejects %s", (qs) => {
    expect(parse(qs).ok).toBe(false);
  });

  it("clamps an out-of-range limit instead of rejecting it", () => {
    expect(parse("limit=999")).toEqual({ ok: true, params: { limit: 50 } });
    expect(parse("limit=0")).toEqual({ ok: true, params: { limit: 12 } });
  });

  it("caps the search query length", () => {
    const r = parse(`q=${"a".repeat(500)}`);
    expect(r.ok && r.params.query?.length).toBe(100);
  });
});
