import { site } from "@/content/site";
import { SiteHeaderView } from "@/components/podcast/chrome";
import type { LabelledLink } from "@/lib/safe-link";

interface SiteHeaderBlockProps {
  siteName?: string;
  logo?: string;
  links?: LabelledLink[];
}

export const siteHeaderBlock = {
  label: "Site Header",
  fields: {
    siteName: { type: "text" as const, label: "Site name" },
    // Named `logo` so P1's media picker attaches. Optional; the name stays as link text.
    logo: { type: "text" as const, label: "Logo image (optional)" },
    links: {
      type: "array" as const,
      label: "Navigation links",
      arrayFields: {
        label: { type: "text" as const, label: "Label" },
        href: { type: "text" as const, label: "Link (/path, https://, or mailto:)" },
      },
      defaultItemProps: { label: "New link", href: "/" },
      getItemSummary: (item: Partial<LabelledLink>) => item.label || "Link",
    },
  },
  defaultProps: {
    siteName: site.name,
    logo: "",
    links: site.nav.map((l) => ({ ...l })),
  },
  render: ({ siteName, logo, links }: Partial<SiteHeaderBlockProps> & { id?: string }) => (
    <SiteHeaderView siteName={siteName} logo={logo} links={links} />
  ),
};
