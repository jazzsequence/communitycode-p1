import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { siteHeaderBlock } from "@/components/puck/podcast/site-header";
import { renderBlock } from "../_helpers/render-block";
import { PLACEHOLDER_IMAGE } from "../_helpers/fixtures-show";

// Block props are an open record: each block validates its own, and the stories omit what they don't vary.
type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Site Header",
  render: (args) => <>{renderBlock(siteHeaderBlock, args)}</>,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
    viewport: {
      options: { narrow: { name: "Phone (390)", styles: { width: "390px", height: "844px" } } },
    },
    docs: {
      description: {
        component:
          "Site-wide header: brand link, primary nav, and a skip-to-content link. The brand and links default to `site.config.ts` and are editable in the block. The current page is marked with `aria-current`. Below the mobile breakpoint the nav collapses behind a Menu button (only once JavaScript is running, so no-JS keeps a full nav). Escape closes the menu and returns focus to the button.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

/**
 * The toggle only exists below the mobile breakpoint. These stories set the Phone viewport; where the
 * canvas is rendered wider anyway (a docs page, a raw iframe) the button is hidden, so skip the click
 * rather than fail.
 */
const openMenu: Story["play"] = async ({ canvasElement }) => {
  const toggle = await within(canvasElement).findByText("Menu");
  if (getComputedStyle(toggle).display !== "none") await userEvent.click(toggle);
};

const phone = { viewport: { value: "narrow", isRotated: false } };

export const Default: Story = {};

/** `/blog` is the current page. */
export const CurrentPage: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/blog" } } },
};

/** Inside a section (`/episodes/some-slug`): the section link is marked, not claimed as the exact page. */
export const InsideSection: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/episodes/episode-36-jacquie-capur" } } },
};

/** The site name stays as the link text next to the logo. */
export const WithLogo: Story = { args: { logo: PLACEHOLDER_IMAGE } };

export const ManyLinks: Story = {
  args: {
    links: [
      { label: "Episodes", href: "/episodes" },
      { label: "Guests", href: "/guests" },
      { label: "Blog", href: "/blog" },
      { label: "Transcripts", href: "/transcripts" },
      { label: "About", href: "/about" },
      { label: "Be a guest", href: "/be-a-guest" },
      { label: "Subscribe", href: "/subscribe" },
    ],
  },
};

export const LongSiteName: Story = { args: { siteName: "Community + Code: a podcast about the people behind the commits" } };

/** Phone viewport (390), menu collapsed. */
export const MobileClosed: Story = { globals: phone };

/** Phone viewport, after clicking Menu. */
export const MobileOpen: Story = {
  globals: phone,
  play: openMenu,
};

export const MobileOpenCurrentPage: Story = {
  globals: phone,
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/about" } } },
  play: openMenu,
};
