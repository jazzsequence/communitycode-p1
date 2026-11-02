import { describe, expect, it } from "vitest";
import { isExternalHref, safeHref, safeImageUrl, safeLinks } from "@/lib/safe-link";

describe("safeHref", () => {
  it.each([
    "/episodes",
    "/episodes/episode-36-jacquie-capur",
    "/a?b=1#c",
    "about",
    "./about",
    "../x",
    "#top",
    "?q=x",
    "https://communitycode.dev/feed",
    "http://example.com",
    "HTTPS://EXAMPLE.COM/x",
    "mailto:chris@example.com",
    "  /trimmed  ",
  ])("allows %s", (href) => {
    expect(safeHref(href)).toBe(href.trim());
  });

  it.each([
    ["javascript:alert(1)"],
    ["JaVaScRiPt:alert(1)"],
    ["  javascript:alert(1)"],
    ["java\tscript:alert(1)"],
    ["java\nscript:alert(1)"],
    ["java script:alert(1)"],
    ["\u0000javascript:alert(1)"],
    [" javascript:alert(1)"],
    ["​javascript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["vbscript:msgbox(1)"],
    ["file:///etc/passwd"],
    ["ftp://example.com"],
    ["tel:+15551234"],
    ["//evil.example"],
    ["//evil.example/path"],
    ["/\\evil.example"],
    ["\\\\evil.example"],
    ["https://"],
    ["http:"],
    ["https://user:pass@evil.example"],
    ["mailto:"],
    ["foo:bar"],
    [""],
    ["   "],
  ])("rejects %j", (href) => {
    expect(safeHref(href)).toBeNull();
  });

  it("rejects non-strings and absurd lengths", () => {
    expect(safeHref(undefined)).toBeNull();
    expect(safeHref(null)).toBeNull();
    expect(safeHref(42)).toBeNull();
    expect(safeHref({ href: "/x" })).toBeNull();
    expect(safeHref(`/${"a".repeat(3000)}`)).toBeNull();
  });
});

describe("safeImageUrl", () => {
  it("allows relative and http(s) but not mailto or scripts", () => {
    expect(safeImageUrl("/uploads/a.jpg")).toBe("/uploads/a.jpg");
    expect(safeImageUrl("https://x.test/a.jpg")).toBe("https://x.test/a.jpg");
    expect(safeImageUrl("mailto:a@b.co")).toBeNull();
    expect(safeImageUrl("javascript:alert(1)")).toBeNull();
    expect(safeImageUrl("data:image/svg+xml,<svg onload=alert(1)>")).toBeNull();
    expect(safeImageUrl("")).toBeNull();
  });
});

describe("isExternalHref", () => {
  it("is true for http(s)/mailto, false for relative or unsafe", () => {
    expect(isExternalHref("https://x.test")).toBe(true);
    expect(isExternalHref("mailto:a@b.co")).toBe(true);
    expect(isExternalHref("/episodes")).toBe(false);
    expect(isExternalHref("javascript:alert(1)")).toBe(false);
  });
});

describe("safeLinks", () => {
  it("drops rows with unsafe/empty hrefs or empty labels and trims labels", () => {
    expect(
      safeLinks([
        { label: " Home ", href: "/" },
        { label: "Evil", href: "javascript:alert(1)" },
        { label: "", href: "/x" },
        { label: "No href", href: "" },
        null,
        "str",
        { label: "Mail", href: "mailto:a@b.co" },
      ]),
    ).toEqual([
      { label: "Home", href: "/" },
      { label: "Mail", href: "mailto:a@b.co" },
    ]);
    expect(safeLinks(undefined)).toEqual([]);
    expect(safeLinks("nope")).toEqual([]);
  });
});
