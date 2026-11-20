import type { Tag } from "@/lib/tags";

/**
 * An episode's or post's tags, as pills. Plain text, not links: there is no tag archive page, and the episode
 * card is already one big link (no nested links). Renders nothing for no tags, so callers don't need to check.
 */
export function TagList({ tags }: { tags?: Tag[] | null }) {
  if (!tags?.length) return null;
  return (
    <ul className="cc-tags" aria-label="Tags">
      {tags.map((t) => (
        <li key={t.slug}>
          <span className="cc-pill">{t.name}</span>
        </li>
      ))}
    </ul>
  );
}
