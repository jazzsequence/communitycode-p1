import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetailView, postCanonicalUrl, postMetaDescription } from "@/components/podcast/post-detail";
import { site } from "@/content/site";
import { loadPostBySlug, type PostDetail } from "@/lib/posts";

/** Rebuild at most every 5 minutes; WordPress responses are cached upstream anyway. */
export const revalidate = 300;

const SLUG = /^[a-z0-9_%-]{1,200}$/i;

// One lookup per request, shared by generateMetadata and the page.
const loadPost = cache(async (slug: string): Promise<PostDetail | null> => {
  if (!SLUG.test(slug)) return null;
  return loadPostBySlug(slug);
});

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: "Post not found", robots: { index: false } };

  const url = postCanonicalUrl(post);
  const description = postMetaDescription(post);
  return {
    title: `${post.title} | ${site.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description,
      siteName: site.name,
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post.imageUrl ? { images: [{ url: post.imageUrl }] } : {}),
    },
    twitter: {
      card: post.imageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      ...(post.imageUrl ? { images: [post.imageUrl] } : {}),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();
  return <PostDetailView post={post} />;
}
