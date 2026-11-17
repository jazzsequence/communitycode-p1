// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hostAboutBlock } from "@/components/puck/podcast/host-about";

vi.mock("@/content/site", () => import("./stubs/site"));
// The real field pulls in the Puck editor; only its type matters here.
vi.mock("@/lib/rich-link-field", () => ({ richtextLinkField: { type: "richtext" } }));

afterEach(cleanup);

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

  it("is a rich-text field, so text can be linked from the editor", () => {
    expect(hostAboutBlock.fields.bio.type).toBe("richtext");
  });

  it("renders stored rich-text HTML with its links, sanitised", () => {
    const { container } = render(
      hostAboutBlock.render({
        name: "X",
        bio: '<p>Works at <a href="https://pantheon.io">Pantheon</a> and <a href="javascript:alert(1)">bad</a><script>1</script></p><p>Second.</p>',
      }),
    );
    const a = [...container.querySelectorAll(".cc-stack .p1-rich a[href]")] as HTMLAnchorElement[]; // an unsafe href is dropped, leaving inert text
    expect(a.map((x) => x.getAttribute("href"))).toEqual(["https://pantheon.io"]);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelectorAll(".cc-stack .p1-rich p")).toHaveLength(2);
  });

  it("renders the live node the editor passes while editing inline", () => {
    const { container } = render(hostAboutBlock.render({ name: "X", bio: <p>Live <a href="/x">link</a></p> }));
    expect(container.querySelector(".p1-rich a")?.getAttribute("href")).toBe("/x");
  });

  it("renders Markdown links, bold and italic in the bio", () => {
    const { container } = render(
      hostAboutBlock.render({
        name: "X",
        bio: "Hosts [WP Builds](https://wpbuilds.com), **loud**, *soft* and `code`.\n\nSee [about](/about) or [mail](mailto:a@b.test).",
      }),
    );
    const links = [...container.querySelectorAll(".cc-stack > p.cc-prose a")] as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["https://wpbuilds.com", "/about", "mailto:a@b.test"]);
    expect(links[0].getAttribute("rel")).toBe("noopener noreferrer");
    expect(links[1].hasAttribute("rel")).toBe(false); // same-site link
    expect(container.querySelector("strong")?.textContent).toBe("loud");
    expect(container.querySelector("em")?.textContent).toBe("soft");
    expect(container.querySelector("code")?.textContent).toBe("code");
    expect(container.querySelectorAll(".cc-stack > p.cc-prose")).toHaveLength(2);
  });

  it("drops unsafe link targets but keeps their text, and ignores other Markdown", () => {
    const { container } = render(
      hostAboutBlock.render({
        name: "X",
        bio: "[click](javascript:alert(1)) and [also](data:text/html;base64,AAAA)\n\n# Heading\n\n![pic](https://x.test/a.png)",
      }),
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("click and also");
    expect(container.querySelector("h1, img")).toBeNull();
  });

  it("renders raw HTML in the bio as text, never as markup", () => {
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
