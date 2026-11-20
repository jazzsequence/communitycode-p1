import { describe, expect, it } from "vitest";
import { mapFeedItem, type RestEpisode } from "@/lib/episodes/wordpress-parse";

const item = { title: "Episode 1: A Guest", link: "https://wp.example/e/", description: "Feed text that is just the show notes." };
const rest = (over: Partial<RestEpisode> = {}): RestEpisode => ({
  id: 5,
  slug: "e",
  link: "https://wp.example/e/",
  excerpt: { rendered: "<p>The auto excerpt&#8230;</p>" },
  ...over,
});

describe("episode description", () => {
  it("is the Yoast meta description when there is one, not the excerpt", () => {
    const e = mapFeedItem(item, rest({ yoast_head_json: { description: "The meta description the editor wrote." } }))!;
    expect(e.description).toBe("The meta description the editor wrote.");
  });

  it("decodes entities and strips markup in it", () => {
    const e = mapFeedItem(item, rest({ yoast_head_json: { description: "Q&amp;A on &lt;b&gt;code&lt;/b&gt; &#8211; and more" } }))!;
    expect(e.description).toBe("Q&A on <b>code</b> – and more");
  });

  it("falls back to the excerpt when Yoast has none (missing, empty or blank)", () => {
    for (const yoast of [undefined, {}, { description: "" }, { description: "   " }]) {
      expect(mapFeedItem(item, rest({ yoast_head_json: yoast }))!.description).toBe("The auto excerpt…");
    }
  });

  it("falls back to the feed text when neither Yoast nor the excerpt has anything", () => {
    const e = mapFeedItem(item, rest({ excerpt: { rendered: "" }, yoast_head_json: { description: "" } }))!;
    expect(e.description).toBe("Feed text that is just the show notes.");
  });

  it("an episode with no REST record at all still uses the feed text", () => {
    expect(mapFeedItem(item, undefined)!.description).toBe("Feed text that is just the show notes.");
  });
});

describe("the REST request", () => {
  it("asks for only Yoast's description, not the whole object (its schema graph is ~25x larger)", async () => {
    const { readFileSync } = await import("node:fs");
    const { vi } = await import("vitest");
    const { loadWordPressEpisodes } = await import("@/lib/episodes/wordpress");
    const feed = readFileSync("lib/episodes/fixtures/feed.xml", "utf8");
    const restJson = readFileSync("lib/episodes/fixtures/rest.json", "utf8");
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        urls.push(String(u));
        return new Response(String(u).includes("/wp-json/") ? restJson : feed, { status: 200 });
      }),
    );
    try {
      await loadWordPressEpisodes({ baseUrl: "https://wp.example", feedPath: "/feed/" });
    } finally {
      vi.unstubAllGlobals();
    }
    const restUrl = new URL(urls.find((u) => u.includes("/wp-json/"))!);
    const fields = restUrl.searchParams.get("_fields")!.split(",");
    expect(fields).toContain("yoast_head_json.description");
    expect(fields).not.toContain("yoast_head_json");
  });
});
