// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// content/site.ts is env-driven: a fresh checkout has no feed/Apple URL, a one-link nav and a generic name.
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/content/site", () => ({
  site: { name: "Podcast", tagline: "", url: "", feedUrl: "", appleUrl: "", nav: [{ label: "Home", href: "/" }] },
}));

import { SiteFooterView, SiteHeaderView } from "@/components/podcast/chrome";
import { SubscribeLinksView } from "@/components/podcast/subscribe-links-view";
import { DEFAULT_SUBSCRIBE_ENTRIES } from "@/components/podcast/subscribe-data";
import { hostAboutBlock } from "@/components/puck/podcast/host-about";

afterEach(cleanup);

describe("with no site env configured", () => {
  it("footer omits the Listen links instead of rendering dead ones", () => {
    render(<SiteFooterView />);
    expect(screen.queryByRole("navigation", { name: "Listen" })).toBeNull();
    expect(screen.queryByRole("link", { name: "RSS feed" })).toBeNull();
    expect(screen.getByRole("navigation", { name: "Footer" })).toBeTruthy();
  });

  it("subscribe links render nothing clickable and no copy button", () => {
    render(<SubscribeLinksView entries={DEFAULT_SUBSCRIBE_ENTRIES} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Copy RSS feed URL" })).toBeNull();
  });

  it("header marks the current route and shows the generic name", () => {
    render(<SiteHeaderView />);
    expect(screen.getByRole("link", { name: "Podcast" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Home" }).some((l) => l.getAttribute("aria-current") === "page")).toBe(true);
  });

  it("host role follows the configured site name", () => {
    expect(hostAboutBlock.defaultProps.role).toBe("Host of Podcast");
  });
});
