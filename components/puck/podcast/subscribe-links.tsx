import { SubscribeLinksView } from "@/components/podcast/subscribe-links-view";
import { DEFAULT_SUBSCRIBE_ENTRIES, PLATFORMS, type SubscribeEntry } from "@/components/podcast/subscribe-data";

interface SubscribeLinksBlockProps {
  heading?: string;
  links?: SubscribeEntry[];
  showCopyFeed?: boolean;
}

export const subscribeLinksBlock = {
  label: "Subscribe Links",
  fields: {
    heading: { type: "text" as const, label: "Heading" },
    links: {
      type: "array" as const,
      label: "Platforms (entries without a URL are hidden)",
      arrayFields: {
        platform: {
          type: "select" as const,
          label: "Platform",
          options: PLATFORMS.map((p) => ({ label: p.label, value: p.value })),
        },
        url: { type: "text" as const, label: "URL" },
        label: { type: "text" as const, label: "Button text (optional)" },
      },
      defaultItemProps: { platform: "spotify", url: "", label: "" },
      getItemSummary: (item: Partial<SubscribeEntry>) =>
        PLATFORMS.find((p) => p.value === item.platform)?.label ?? "Platform",
    },
    showCopyFeed: {
      type: "radio" as const,
      label: "Show “Copy RSS feed URL” button",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
  },
  defaultProps: {
    heading: "Subscribe",
    links: DEFAULT_SUBSCRIBE_ENTRIES,
    showCopyFeed: true,
  },
  render: ({ heading, links, showCopyFeed }: Partial<SubscribeLinksBlockProps> & { id?: string }) => (
    <SubscribeLinksView heading={heading} entries={links} showCopyFeed={showCopyFeed} />
  ),
};
