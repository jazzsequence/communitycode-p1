import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WP_USER_AGENT } from "@/lib/config";
import { wpFetch, wpHeaders } from "@/lib/episodes/wordpress";

const base = { baseUrl: "https://wp.example.test", feedPath: "/feed/" };

afterEach(() => vi.unstubAllGlobals());

describe("wpHeaders", () => {
  it("sends the configured User-Agent exactly: Pantheon's allowlist is an exact match", () => {
    const h = wpHeaders(
      { ...base, userAgent: "my-site/2.0" },
      "application/json",
    ) as Record<string, string>;
    expect(h["User-Agent"]).toBe("my-site/2.0");
  });

  it("falls back to the default User-Agent", () => {
    const h = wpHeaders(base, "application/json") as Record<string, string>;
    expect(h["User-Agent"]).toBe(DEFAULT_WP_USER_AGENT);
  });

  it("sends the bypass token only when one is set", () => {
    expect(wpHeaders(base, "x")).not.toHaveProperty("x-pantheon-bot-bypass");
    expect(wpHeaders({ ...base, bypassToken: "t" }, "x")).toHaveProperty(
      "x-pantheon-bot-bypass",
      "t",
    );
  });
});

describe("wpFetch on a Pantheon challenge", () => {
  it("names both fixes, and that tokens expire, without leaking the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("", {
            status: 403,
            headers: { "cf-mitigated": "challenge" },
          }),
      ),
    );
    const err = await wpFetch(
      { ...base, userAgent: "my-site/2.0", bypassToken: "SECRET-TOKEN" },
      `${base.baseUrl}/feed/`,
      "x",
    ).then(
      () => null,
      (e: Error) => e,
    );
    expect(err?.message).toContain('"my-site/2.0"');
    expect(err?.message).toContain("gcdn:ua-bypass:add");
    expect(err?.message).toMatch(/expire/);
    expect(err?.message).not.toContain("SECRET-TOKEN");
  });
});
