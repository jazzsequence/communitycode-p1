import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { siteFooterBlock } from "@/components/puck/podcast/site-footer";
import { renderBlock } from "../_helpers/render-block";

// Block props are an open record: each block validates its own, and the stories omit what they don't vary.
type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Site Footer",
  render: (args) => <>{renderBlock(siteFooterBlock, args)}</>,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
    viewport: {
      options: { narrow: { name: "Phone (390)", styles: { width: "390px", height: "844px" } } },
    },
    docs: {
      description: {
        component:
          "Site-wide footer: site name and tagline, an Explore nav, a Listen column (Apple Podcasts and RSS, taken from `site.config.ts`; each is hidden if unset), optional extra links, and a copyright line whose year is added automatically.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const ExtraLinks: Story = {
  args: {
    extraLinks: [
      { label: "Privacy", href: "/privacy" },
      { label: "Contact", href: "/contact" },
      { label: "Code of conduct", href: "/code-of-conduct" },
    ],
  },
};

export const NoTagline: Story = { args: { tagline: "" } };

export const NoCopyrightOwner: Story = { args: { copyrightText: "" } };

export const FewLinks: Story = {
  args: { links: [{ label: "Episodes", href: "/episodes" }, { label: "About", href: "/about" }] },
};

export const CurrentPage: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/blog" } } },
};

export const Mobile: Story = {
  globals: { viewport: { value: "narrow", isRotated: false } },
  args: { extraLinks: [{ label: "Privacy", href: "/privacy" }, { label: "Contact", href: "/contact" }] },
};
