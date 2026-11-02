import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEpisodeSource } from "@/lib/episodes";
import type { Episode } from "@/lib/episodes";
import { EpisodeDetail, episodeCanonicalUrl, episodeMetaDescription } from "@/components/podcast/episode-detail";
import { site } from "@/content/site";

/** Rebuild at most every 5 minutes; the feed is cached upstream anyway. */
export const revalidate = 300;

const SLUG = /^[a-z0-9-]{1,200}$/i;

// One lookup per request, shared by generateMetadata and the page.
const loadEpisode = cache(async (slug: string): Promise<Episode | null> => {
  if (!SLUG.test(slug)) return null;
  return getEpisodeSource().bySlug(slug);
});

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const episode = await loadEpisode(slug);
  if (!episode) return { title: "Episode not found", robots: { index: false } };

  const url = episodeCanonicalUrl(episode);
  const description = episodeMetaDescription(episode);
  const title = `${episode.title} | ${site.name}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: episode.title,
      description,
      siteName: site.name,
      publishedTime: episode.publishedAt,
      ...(episode.artworkUrl ? { images: [{ url: episode.artworkUrl }] } : {}),
      ...(episode.audio ? { audio: [{ url: episode.audio.url, type: episode.audio.contentType ?? "audio/mpeg" }] } : {}),
    },
    twitter: {
      card: episode.artworkUrl ? "summary_large_image" : "summary",
      title: episode.title,
      description,
      ...(episode.artworkUrl ? { images: [episode.artworkUrl] } : {}),
    },
  };
}

export default async function EpisodePage({ params }: Props) {
  const { slug } = await params;
  const episode = await loadEpisode(slug);
  if (!episode) notFound();
  return <EpisodeDetail episode={episode} />;
}
