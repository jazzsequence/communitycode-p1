// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname: string | null = "/episodes";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/content/site", () => import("./stubs/site"));

import { SiteHeaderView, SiteFooterView } from "@/components/podcast/chrome";
import { currentState, copyrightYear } from "@/components/podcast/chrome-nav";
import { siteHeaderBlock } from "@/components/puck/podcast/site-header";
import { siteFooterBlock } from "@/components/puck/podcast/site-footer";
import { site } from "@/content/site";

beforeEach(() => {
  pathname = "/episodes";
});
afterEach(cleanup);

describe("currentState", () => {
  it("marks the exact route page, sections true, and nothing else", () => {
    expect(currentState("/episodes", "/episodes")).toBe("page");
    expect(currentState("/episodes/", "/episodes")).toBe("page");
    expect(currentState("/episodes/episode-36", "/episodes")).toBe("true");
    expect(currentState("/episodes-archive", "/episodes")).toBeUndefined();
    expect(currentState("/blog", "/episodes")).toBeUndefined();
    expect(currentState("/episodes", "/")).toBeUndefined();
    expect(currentState("/", "/")).toBe("page");
    expect(currentState("/episodes", "/episodes?x=1#y")).toBe("page");
    expect(currentState("/episodes", "https://x.test/episodes")).toBeUndefined();
    expect(currentState(null, "/episodes")).toBeUndefined();
  });
});

describe("SiteHeaderView", () => {
  it("renders a labelled primary nav with the default site links and a skip link", () => {
    render(<SiteHeaderView />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(site.nav.map((l) => l.label));
    expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe("#main-content");
    expect(screen.getByRole("link", { name: site.name }).getAttribute("href")).toBe("/");
  });

  it("sets aria-current=page on the current route only", () => {
    render(<SiteHeaderView />);
    const current = screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.textContent)).toEqual(["Episodes"]);
  });

  it("marks the section (not page) when on a child route", () => {
    pathname = "/episodes/episode-36-jacquie-capur";
    render(<SiteHeaderView />);
    expect(screen.getByRole("link", { name: "Episodes" }).getAttribute("aria-current")).toBe("true");
  });

  it("does not crash when the pathname is unavailable", () => {
    pathname = null;
    render(<SiteHeaderView />);
    expect(screen.getAllByRole("link").some((l) => l.hasAttribute("aria-current"))).toBe(false);
  });

  it("drops unsafe hrefs from the editable list", () => {
    render(
      <SiteHeaderView
        links={[
          { label: "Fine", href: "/fine" },
          { label: "Bad", href: "javascript:alert(1)" },
        ]}
      />,
    );
    expect(screen.queryByRole("link", { name: "Bad" })).toBeNull();
    expect(screen.getByRole("link", { name: "Fine" })).toBeTruthy();
  });

  describe("mobile menu", () => {
    it("is a real button wired to the nav with aria-expanded", () => {
      render(<SiteHeaderView />);
      const btn = screen.getByRole("button", { name: "Menu" });
      const nav = screen.getByRole("navigation", { name: "Primary" });
      expect(btn.tagName).toBe("BUTTON");
      expect(btn.getAttribute("aria-controls")).toBe(nav.id);
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(btn);
      expect(btn.getAttribute("aria-expanded")).toBe("true");
      expect(document.querySelector("header")?.classList.contains("is-open")).toBe(true);
      fireEvent.click(btn);
      expect(btn.getAttribute("aria-expanded")).toBe("false");
    });

    it("Escape closes the menu and returns focus to the button", () => {
      render(<SiteHeaderView />);
      const btn = screen.getByRole("button", { name: "Menu" });
      fireEvent.click(btn);
      const link = screen.getByRole("link", { name: "Blog" });
      link.focus();
      expect(document.activeElement).toBe(link);
      fireEvent.keyDown(link, { key: "Escape" });
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(btn);
    });

    it("Escape while closed does nothing", () => {
      render(<SiteHeaderView />);
      const link = screen.getByRole("link", { name: "Blog" });
      link.focus();
      fireEvent.keyDown(link, { key: "Escape" });
      expect(document.activeElement).toBe(link);
    });

    it("closes after choosing a link", () => {
      render(<SiteHeaderView />);
      const btn = screen.getByRole("button", { name: "Menu" });
      fireEvent.click(btn);
      // jsdom can't navigate; stop it logging "not implemented".
      document.addEventListener("click", (e) => e.preventDefault(), { once: true });
      fireEvent.click(screen.getByRole("link", { name: "Blog" }));
      expect(btn.getAttribute("aria-expanded")).toBe("false");
    });

    it("keeps the nav in the DOM when closed (no JS-only desktop nav)", () => {
      render(<SiteHeaderView />);
      expect(screen.getByRole("navigation", { name: "Primary" }).querySelectorAll("a").length).toBe(site.nav.length);
    });
  });

  it("skip link focuses #main-content when it exists", () => {
    render(
      <>
        <SiteHeaderView />
        <main id="main-content">content</main>
      </>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Skip to content" }));
    expect(document.activeElement).toBe(document.getElementById("main-content"));
  });

  it("ignores an unsafe logo URL", () => {
    const { container } = render(<SiteHeaderView logo="javascript:alert(1)" />);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("SiteFooterView", () => {
  it("shows tagline, nav, Apple + RSS links and a copyright with the current UTC year", () => {
    render(<SiteFooterView />);
    expect(screen.getByText(site.tagline)).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Footer" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Apple Podcasts" }).getAttribute("href")).toBe(site.appleUrl);
    expect(screen.getByRole("link", { name: "RSS feed" }).getAttribute("href")).toBe(site.feedUrl);
    expect(document.querySelector(".cc-chrome-copy")?.textContent).toBe(`© ${new Date().getUTCFullYear()} ${site.name}`);
  });

  it("copyrightYear is UTC, not local", () => {
    expect(copyrightYear(new Date("2026-12-31T23:59:59Z"))).toBe(2026);
    expect(copyrightYear(new Date("2027-01-01T00:00:00Z"))).toBe(2027);
  });

  it("renders extra links only when safe", () => {
    render(
      <SiteFooterView
        extraLinks={[
          { label: "Privacy", href: "/privacy" },
          { label: "Pwn", href: "javascript:alert(1)" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/privacy");
    expect(screen.queryByRole("link", { name: "Pwn" })).toBeNull();
  });
});

describe("blocks render in the editor canvas with no data", () => {
  it("header block with defaults and with nothing", () => {
    const { rerender } = render(siteHeaderBlock.render(siteHeaderBlock.defaultProps));
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    rerender(siteHeaderBlock.render({}));
    expect(screen.getByRole("link", { name: site.name })).toBeTruthy();
  });

  it("footer block with defaults and with nothing", () => {
    const { rerender } = render(siteFooterBlock.render(siteFooterBlock.defaultProps));
    expect(screen.getByRole("link", { name: "RSS feed" })).toBeTruthy();
    rerender(siteFooterBlock.render({}));
    expect(screen.getByRole("link", { name: "RSS feed" })).toBeTruthy();
  });

  it("header nav field defaults to site.nav", () => {
    expect(siteHeaderBlock.defaultProps.links).toEqual(site.nav);
  });
});

