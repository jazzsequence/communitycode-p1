import "../styles.css";
import type { Metadata } from "next";
import { HtmlShell } from "../../components/html-shell";
import { site } from "../../content/site";

const siteUrl = site.url;

// The site (app/[[...puckPath]]) and editor are separate root layouts; code
// routes such as /episodes/[slug] need their own. Pages set their own metadata.
export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
};

export default function EpisodesLayout({ children }: { children: React.ReactNode }) {
  return <HtmlShell lang="en">{children}</HtmlShell>;
}
