import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { hostAboutBlock } from "@/components/puck/podcast/host-about";
import { renderBlock } from "../_helpers/render-block";
import { PLACEHOLDER_IMAGE } from "../_helpers/fixtures-show";

const bio =
  "Chris Reynolds is a developer advocate who has spent most of his career in and around WordPress and open source communities.\n\nHe started Community + Code to talk to the people behind the commits: maintainers, advocates, and the folks who keep a project welcoming.";

// Block props are an open record: each block validates its own, and the stories omit what they don't vary.
type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Host About",
  render: (args) => <>{renderBlock(hostAboutBlock, args)}</>,
  args: {
    name: "Chris Reynolds",
    role: "Host of Community + Code",
    bio,
  },
  parameters: {
    docs: {
      description: {
        component:
          "A person section: photo (or an initials tile when there is none), role, name, plain-text bio (blank line = new paragraph, never HTML) and optional link buttons. The photo sits left or right and stacks above the text on narrow screens.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

const links = [
  { label: "Website", href: "https://example.invalid" },
  { label: "Mastodon", href: "https://example.invalid/@chris" },
  { label: "Email", href: "mailto:hello@example.invalid" },
];

/** No photo: the initials tile. */
export const Default: Story = {};

export const WithLinks: Story = { args: { links } };

/** A bundled placeholder image stands in for the real one. */
export const WithPhoto: Story = { args: { image: PLACEHOLDER_IMAGE, imageAlt: "Chris Reynolds", links } };

export const PhotoRight: Story = { args: { layout: "right", image: PLACEHOLDER_IMAGE, links } };

export const InitialsRight: Story = { args: { layout: "right" } };

export const NameOnly: Story = { args: { role: "", bio: "" } };

export const LongBio: Story = {
  args: {
    links,
    bio: [bio, bio, "A final paragraph so the text column is clearly taller than the photo column and the media stays aligned to the top."].join("\n\n"),
  },
};

/** Unsafe or empty links are dropped, never rendered as dead buttons. */
export const UnsafeLinksDropped: Story = {
  args: {
    links: [
      { label: "Fine", href: "https://example.invalid" },
      { label: "Dropped (javascript:)", href: "javascript:alert(1)" },
      { label: "Dropped (empty)", href: "" },
    ],
  },
};
