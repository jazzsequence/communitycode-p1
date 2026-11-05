import sanitizeHtml from "sanitize-html";

/**
 * Show notes arrive as HTML from WordPress and show.fm and are rendered with
 * dangerouslySetInnerHTML, so they are always passed through here first.
 *
 * Embedded video is allowed from YouTube only: show notes open with the
 * episode's video embed.
 */

const ALLOWED_IFRAME_HOSTS = ["www.youtube.com", "www.youtube-nocookie.com", "youtube.com"];

// WordPress appends "The post X appeared first on Y." to feed items.
const FEED_FOOTER = /<p>\s*The post\b[\s\S]*?appeared first on[\s\S]*?<\/p>\s*$/i;

export function sanitizeShowNotes(html: string | null | undefined): string | null {
  if (!html) return null;
  const clean = sanitizeHtml(html.replace(FEED_FOOTER, ""), {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "figure",
      "figcaption",
      "iframe",
      "img",
      "h1",
      "h2",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      iframe: ["src", "title", "width", "height", "allow", "allowfullscreen", "loading"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedIframeHostnames: ALLOWED_IFRAME_HOSTS,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer" },
      }),
    },
  }).trim();
  return clean || null;
}

/** Strip all markup. For card descriptions and meta tags. */
export function toPlainText(html: string | null | undefined): string {
  if (!html) return "";
  // sanitize-html decodes entities then re-escapes only these three, so undo
  // them to get readable text (it is never injected as HTML).
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Descriptions imported from a WordPress feed end with "The post X appeared
 * first on Y." Strip it from plain text (show.fm's import keeps it verbatim).
 */
export function cleanDescription(text: string | null | undefined): string {
  return (text ?? "").replace(/\s*The post\b.*?\bappeared first on\b.*$/is, "").replace(/\s+/g, " ").trim();
}
