import "../styles.css";
import type { Metadata } from "next";
import { HtmlShell } from "../../components/html-shell";
import { published } from "../published-pages";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

// A page-level openGraph replaces (not merges) this one, so buildPageMetadata
// re-declares og:type and the env site-name fallback; this covers routes that
// return no openGraph (e.g. not-found early returns).
export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  openGraph: {
    type: "website",
    siteName: process.env.NEXT_PUBLIC_SITE_NAME,
  },
};

/** Root layout for the site: `<html lang>` is the language of the page shown. */
export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ puckPath?: string[] }>;
}) {
  const lang = (await published.getDocumentLanguage({ params })) ?? "en";
  return <HtmlShell lang={lang}>{children}</HtmlShell>;
}
