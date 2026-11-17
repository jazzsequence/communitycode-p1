import ReactMarkdown from "react-markdown";
import { site } from "@/content/site";
import { GuestAvatar } from "@/components/podcast/guest-avatar";
import { isExternalHref, safeHref, safeImageUrl, safeLinks, type LabelledLink } from "@/lib/safe-link";
import "@/components/podcast/chrome-blocks.css";

interface HostAboutProps {
  name?: string;
  role?: string;
  bio?: string;
  image?: string;
  imageAlt?: string;
  links?: LabelledLink[];
  layout?: "left" | "right";
}

/**
 * The bio is Markdown, limited to what a bio needs: paragraphs, **bold**, *italic*,
 * `code` and [links](https://...). react-markdown builds React elements (no
 * dangerouslySetInnerHTML) and shows raw HTML as text, so a pasted `<script>` is inert.
 * Every link goes through `safeHref`, so `javascript:` and friends render as plain text.
 */
const BIO_ELEMENTS = ["p", "strong", "em", "code", "a", "br"];

function BioMarkdown({ bio }: { bio: string }) {
  return (
    <ReactMarkdown
      allowedElements={BIO_ELEMENTS}
      unwrapDisallowed
      urlTransform={(url) => safeHref(url) ?? ""}
      components={{
        // A single newline inside a paragraph stays a line break, as the plain-text bio did.
        p: ({ children }) => (
          <p className="cc-prose" style={{ whiteSpace: "pre-line" }}>
            {children}
          </p>
        ),
        a: ({ href, children }) =>
          href ? (
            <a href={href} {...(isExternalHref(href) ? { rel: "noopener noreferrer" } : {})}>
              {children}
            </a>
          ) : (
            <>{children}</>
          ),
      }}
    >
      {bio}
    </ReactMarkdown>
  );
}

export function HostAbout({ name = "", role, bio, image, imageAlt, links, layout = "left" }: HostAboutProps) {
  const src = safeImageUrl(image);
  const bioText = bio?.trim() ?? "";
  const safe = safeLinks(links);
  const displayName = name.trim();

  return (
    <section className="cc-section">
      <div className={`cc-container cc-host${layout === "right" ? " cc-host--right" : ""}`}>
        <div className="cc-host-media">
          <GuestAvatar name={displayName} photoUrl={src} alt={imageAlt} />
        </div>
        <div className="cc-stack">
          {role?.trim() ? <p className="cc-eyebrow" style={{ margin: 0 }}>{role}</p> : null}
          {displayName ? <h2 style={{ fontSize: "var(--cc-text-xl)" }}>{displayName}</h2> : null}
          {bioText ? <BioMarkdown bio={bioText} /> : null}
          {safe.length ? (
            <ul className="cc-host-links">
              {safe.map((l, i) => (
                <li key={`${i}-${l.href}`}>
                  <a className="cc-btn" href={l.href} rel="noopener noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const hostAboutBlock = {
  label: "Host / About",
  fields: {
    name: { type: "text" as const, label: "Name" },
    role: { type: "text" as const, label: "Role / subtitle" },
    bio: { type: "textarea" as const, label: "Bio (Markdown: [text](https://…), **bold**, *italic*; blank line between paragraphs)" },
    // Must stay named `image` so P1's media picker attaches.
    image: { type: "text" as const, label: "Photo" },
    imageAlt: { type: "text" as const, label: "Photo description (leave empty if the name is enough)" },
    links: {
      type: "array" as const,
      label: "Links",
      arrayFields: {
        label: { type: "text" as const, label: "Label" },
        href: { type: "text" as const, label: "Link (/path, https://, or mailto:)" },
      },
      defaultItemProps: { label: "New link", href: "https://" },
      getItemSummary: (item: Partial<LabelledLink>) => item.label || "Link",
    },
    layout: {
      type: "radio" as const,
      label: "Photo position",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },
  },
  defaultProps: {
    name: "Host name",
    role: `Host of ${site.name}`,
    bio: "Replace this with a short bio.\n\nSeparate paragraphs with a blank line.",
    image: "",
    imageAlt: "",
    links: [] as LabelledLink[],
    layout: "left" as const,
  },
  render: ({ id: _id, ...props }: Partial<HostAboutProps> & { id?: string }) => <HostAbout {...props} />,
};
