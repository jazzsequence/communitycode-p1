import type { Config } from "@puckeditor/core";
import { latestEpisodeHeroBlock } from "./latest-episode-hero";
import { episodeArchiveBlock } from "./episode-archive";
import { episodePlayerBlock } from "./episode-player";
import { transcriptViewerBlock } from "./transcript-viewer";
import { guestGridBlock } from "./guest-grid";
import { blogArchiveBlock } from "./blog-archive";
import { hostAboutBlock } from "./host-about";
import { subscribeLinksBlock } from "./subscribe-links";
import { newsletterSignupBlock } from "./newsletter-signup";
import { siteSearchBlock } from "./site-search";
import { siteHeaderBlock } from "./site-header";
import { siteFooterBlock } from "./site-footer";

/**
 * Community + Code blocks. `puck.config.tsx` spreads both exports, so adding a
 * block is: create the file, import it here, add it to `podcastBlocks` and a
 * category. Block ids (the keys) are stored in page content: never rename one
 * that has shipped.
 */
export const podcastBlocks = {
  LatestEpisodeHero: latestEpisodeHeroBlock,
  EpisodeArchive: episodeArchiveBlock,
  EpisodePlayer: episodePlayerBlock,
  TranscriptViewer: transcriptViewerBlock,
  GuestGrid: guestGridBlock,
  BlogArchive: blogArchiveBlock,
  HostAbout: hostAboutBlock,
  SubscribeLinks: subscribeLinksBlock,
  NewsletterSignup: newsletterSignupBlock,
  SiteSearch: siteSearchBlock,
  SiteHeader: siteHeaderBlock,
  SiteFooter: siteFooterBlock,
} satisfies Config["components"];

export const podcastCategories = {
  episodes: { title: "Episodes", components: ["LatestEpisodeHero", "EpisodeArchive", "EpisodePlayer", "TranscriptViewer", "GuestGrid"] },
  content: { title: "Content", components: ["BlogArchive", "HostAbout", "SubscribeLinks", "NewsletterSignup", "SiteSearch"] },
  site: { title: "Site", components: ["SiteHeader", "SiteFooter"] },
} satisfies NonNullable<Config["categories"]>;
