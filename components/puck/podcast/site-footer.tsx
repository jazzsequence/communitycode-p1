import { site } from "@/content/site";
import { SiteFooterView } from "@/components/podcast/chrome";
import type { LabelledLink } from "@/lib/safe-link";

interface SiteFooterBlockProps {
  tagline?: string;
  links?: LabelledLink[];
  extraLinks?: LabelledLink[];
  copyrightText?: string;
}

const linkFields = {
  label: { type: "text" as const, label: "Label" },
  href: { type: "text" as const, label: "Link (/path, https://, or mailto:)" },
};

export const siteFooterBlock = {
  label: "Site Footer",
  fields: {
    tagline: { type: "text" as const, label: "Tagline" },
    links: {
      type: "array" as const,
      label: "Navigation links",
      arrayFields: linkFields,
      defaultItemProps: { label: "New link", href: "/" },
      getItemSummary: (item: Partial<LabelledLink>) => item.label || "Link",
    },
    extraLinks: {
      type: "array" as const,
      label: "Extra links (privacy, contact, ...)",
      arrayFields: linkFields,
      defaultItemProps: { label: "New link", href: "/" },
      getItemSummary: (item: Partial<LabelledLink>) => item.label || "Link",
    },
    copyrightText: { type: "text" as const, label: "Copyright owner (the year is added automatically)" },
  },
  defaultProps: {
    tagline: site.tagline,
    links: site.nav.map((l) => ({ ...l })),
    extraLinks: [] as LabelledLink[],
    copyrightText: site.name,
  },
  render: ({ tagline, links, extraLinks, copyrightText }: Partial<SiteFooterBlockProps> & { id?: string }) => (
    <SiteFooterView tagline={tagline} links={links} extraLinks={extraLinks} copyrightText={copyrightText} />
  ),
};
