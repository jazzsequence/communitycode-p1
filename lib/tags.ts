import { toPlainText } from "@/lib/episodes/sanitize";

/** An editorial tag (WordPress `post_tag`). Shared by episodes and blog posts. */
export interface Tag {
  /** Entity-decoded plain text. */
  name: string;
  slug: string;
}

interface RawTerm {
  taxonomy?: string;
  name?: string;
  slug?: string;
}

/**
 * Tags from a WordPress `_embedded["wp:term"]` value: an array of arrays, one per taxonomy (categories and
 * tags arrive together on a post), so keep only `post_tag`. Anything malformed is dropped, not thrown on, and
 * a slug that appears twice is kept once. Needs `_embed=wp:term` (and `_links` in `_fields`) on the request.
 */
export function mapTags(embeddedTerms: unknown): Tag[] {
  if (!Array.isArray(embeddedTerms)) return [];
  const seen = new Set<string>();
  const tags: Tag[] = [];
  for (const group of embeddedTerms) {
    if (!Array.isArray(group)) continue;
    for (const term of group as RawTerm[]) {
      if (term?.taxonomy !== "post_tag" || typeof term.slug !== "string" || !term.slug) continue;
      const name = toPlainText(term.name) || term.slug;
      if (seen.has(term.slug)) continue;
      seen.add(term.slug);
      tags.push({ name, slug: term.slug });
    }
  }
  return tags;
}
