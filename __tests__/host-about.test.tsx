// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bioParagraphs, hostAboutBlock } from "@/components/puck/podcast/host-about";

vi.mock("@/content/site", () => import("./stubs/site"));

afterEach(cleanup);

describe("bioParagraphs", () => {
  it("splits on blank lines (any newline style / trailing spaces) and drops empties", () => {
    expect(bioParagraphs("One.\n\nTwo.\r\n  \r\nThree.\n\n\n")).toEqual(["One.", "Two.", "Three."]);
    expect(bioParagraphs(undefined)).toEqual([]);
    expect(bioParagraphs("   ")).toEqual([]);
  });
});

describe("HostAbout block", () => {
  it("renders neutral defaults with no person-specific text", () => {
    render(hostAboutBlock.render(hostAboutBlock.defaultProps));
    expect(screen.getByRole("heading", { name: "Host name" })).toBeTruthy();
    expect(screen.getByText("Host of Community + Code")).toBeTruthy(); // from the mocked site.name
    expect(JSON.stringify(hostAboutBlock.defaultProps)).not.toMatch(/Chris|Reynolds/);
    // No image configured: decorative initials, no <img>.
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector(".cc-avatar")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the bio as text, never HTML", () => {
    const { container } = render(
      hostAboutBlock.render({ name: "X", bio: "<img src=x onerror=alert(1)> <b>bold</b>\n\nSecond <script>1</script>" }),
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    const ps = container.querySelectorAll(".cc-stack > p.cc-prose");
    expect(ps).toHaveLength(2);
    expect(ps[0].textContent).toContain("<b>bold</b>");
  });

  it("uses the image with its alt text, hides unsafe image URLs, and layouts right", () => {
    const { container, rerender } = render(
      hostAboutBlock.render({ name: "X", image: "https://x.test/a.jpg", imageAlt: "Chris at a mic", layout: "right" }),
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://x.test/a.jpg");
    expect(img?.getAttribute("alt")).toBe("Chris at a mic");
    expect(container.querySelector(".cc-host--right")).toBeTruthy();
    rerender(hostAboutBlock.render({ name: "X", image: "javascript:alert(1)" }));
    expect(container.querySelector("img")).toBeNull();
  });

  it("filters unsafe links and renders with no props", () => {
    const { container, rerender } = render(
      hostAboutBlock.render({
        name: "X",
        links: [
          { label: "Site", href: "https://x.test" },
          { label: "Bad", href: "javascript:alert(1)" },
        ],
      }),
    );
    expect(screen.getByRole("link", { name: "Site" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Bad" })).toBeNull();
    rerender(hostAboutBlock.render({}));
    expect(container.querySelector("h2")).toBeNull();
  });

  it("names the photo field `image` so the media picker attaches", () => {
    expect(Object.keys(hostAboutBlock.fields)).toContain("image");
  });
});
