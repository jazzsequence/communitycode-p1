import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalloutBlock } from "@/components/puck/blocks/callout/callout.block";
import { CardGridBlock } from "@/components/puck/blocks/card-grid/card-grid.block";
import { ColumnsBlock } from "@/components/puck/blocks/columns/columns.block";
import { ContainerBlock } from "@/components/puck/blocks/container/container.block";
import { CtaBannerBlock } from "@/components/puck/blocks/cta/cta.block";
import { DividerBlock } from "@/components/puck/blocks/divider/divider.block";
import { FaqBlock } from "@/components/puck/blocks/faq/faq.block";
import { FeatureMediaBlock } from "@/components/puck/blocks/feature-media/feature-media.block";
import { HeadingBlock } from "@/components/puck/blocks/heading/heading.block";
import { HeroBlock } from "@/components/puck/blocks/hero/hero.block";
import { ImageBlock } from "@/components/puck/blocks/image/image.block";
import { ListBlock } from "@/components/puck/blocks/list/list.block";
import { ParagraphBlock } from "@/components/puck/blocks/paragraph/paragraph.block";
import { Stack, button, kit, list, paragraph } from "../_helpers/kit-content";
import { IMG } from "../_helpers/kit-images";
import { slot } from "../_helpers/render-block";

/**
 * Acceptance test for the layout contract (app/layout-contract.css): kit blocks and
 * podcast blocks are stacked the way a visitor sees a page, and every block's
 * content must start on the same left edge. Turn the "Layout guides" toolbar
 * toggle on: the two dashed lines mark the shared left and right edges.
 *
 * The `.cc-container.cc-section` sections stand in for podcast blocks such as
 * EpisodeArchive (plain markup: the real blocks need the episodes API).
 */
const meta = {
  title: "Kit blocks/Page composition",
  parameters: {
    docs: {
      description: {
        component:
          "A realistic page: kit blocks interleaved with podcast-style `.cc-container.cc-section` sections. With guides on, the heading of every block must touch the left guide and nothing may cross the right one, at 1280px and at 390px.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Stand-in for a podcast block (EpisodeArchive, GuestGrid...): the same wrapper classes. */
function PodcastSection({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <section className="cc-container cc-section">
      <p className="cc-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="cc-grid" style={{ marginTop: "var(--cc-space-5)" }}>
        {["Episode 36: Jacquie Capur", "Episode 35: A maintainer's year", "Episode 34: Tools that last"].map((t) => (
          <article key={t} className="cc-card" style={{ padding: "var(--cc-space-5)" }}>
            <p className="cc-eyebrow">Season 2</p>
            <h3 style={{ margin: 0 }}>{t}</h3>
            <p className="cc-muted">A short episode description, two lines or so of supporting copy.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const faqItems = [
  { q: "How often do new episodes come out?", a: "Every other week, usually on a Tuesday." },
  { q: "Can I be a guest?", a: "Yes. Fill in the guest form and we will be in touch." },
  { q: "Are transcripts available?", a: "Every episode has a full, searchable transcript." },
];

export const FullPage: Story = {
  render: () => (
    <>
      {kit(HeroBlock, {
        eyebrow: "New episode every other week",
        title: "Conversations with the people behind open source.",
        description: "A podcast about the code, the communities that grow around it, and the humans who keep both going.",
        primaryLabel: "Listen now",
        secondaryLabel: "Browse the archive →",
        primaryHref: "#",
        secondaryHref: "#",
        imageSrc: IMG.hero,
      })}
      {kit(HeadingBlock, { text: "What this show is", level: "H2" })}
      {kit(ParagraphBlock, {
        text: "<p>No scripts and no sales pitch: just people who build and look after open source talking about how it actually goes. Every episode has show notes and a full transcript.</p>",
        style: "lead",
      })}
      <PodcastSection eyebrow="Latest" title="Recent episodes" />
      {kit(ColumnsBlock, {
        distribution: "1:1:1",
        col1: slot(<Stack title="Listen" cta="Open your podcast app" />),
        col2: slot(
          <>
            {kit(HeadingBlock, { text: "Read", level: "H3" })}
            {kit(ParagraphBlock, { text: "<p>Transcripts and show notes for every episode.</p>" })}
            {kit(ListBlock, { items: [{ text: "Searchable" }, { text: "Linked to the audio" }], style: "check" })}
          </>,
        ),
        col3: slot(
          <>
            {kit(ImageBlock, { src: IMG.card1, alt: "", ratio: "4 / 3" })}
            {kit(CalloutBlock, { variant: "tip", title: "Short on time?", body: "Start with the transcript." })}
          </>,
        ),
      })}
      {kit(CalloutBlock, {
        variant: "info",
        title: "The show moved",
        body: "Audio is now hosted on show.fm. Your existing subscription keeps working.",
      })}
      {kit(CardGridBlock, {
        heading: "Featured guests",
        columns: "3",
        items: [
          { title: "Jacquie Capur", subtitle: "Community", imageUrl: IMG.card1, href: "#" },
          { title: "A maintainer", subtitle: "Open source", imageUrl: IMG.card2, href: "#" },
          { title: "A teacher", subtitle: "Education", imageUrl: IMG.card3, href: "#" },
        ],
      })}
      {kit(DividerBlock, { style: "solid", spacing: "medium" })}
      {kit(FeatureMediaBlock, {
        eyebrow: "About the show",
        title: "Built around real conversations.",
        body: "Recorded live with guests, lightly edited, published with the full transcript.",
        bullets: [{ text: "Recorded live" }, { text: "Full transcripts" }],
        buttonLabel: "Meet the guests",
        buttonHref: "#",
        imageSrc: IMG.wide,
        layout: "image left",
        tone: "white",
      })}
      <PodcastSection eyebrow="Archive" title="Every episode" />
      {kit(ContainerBlock, {
        tone: "light",
        pad: "regular",
        maxWidth: "standard",
        content: slot(
          <>
            {paragraph("A container holds grouped copy in a box. It sits on the same gutter as everything else.")}
            {button("Read more", "secondary")}
          </>,
        ),
      })}
      {kit(FaqBlock, { heading: "Questions, answered", items: faqItems })}
      {kit(CtaBannerBlock, {
        title: "Never miss an episode",
        subtitle: "New conversations every other week, in your podcast app and in your inbox.",
        buttonLabel: "Subscribe",
        buttonHref: "#",
        tone: "yellow",
        image: IMG.hero,
      })}
    </>
  ),
};

/** Hero variants back to back, to check the section rhythm between them. */
export const HeroThenSections: Story = {
  render: () => (
    <>
      {kit(HeroBlock, {
        eyebrow: "Season 2",
        title: "Text-only hero, then sections.",
        description: "The hero's copy and the heading below must share one left edge.",
        primaryLabel: "Listen now",
        primaryHref: "#",
        secondaryLabel: "",
        layout: "text only",
        tone: "dark",
        imageSrc: IMG.hero,
      })}
      <PodcastSection eyebrow="Latest" title="Recent episodes" />
      {kit(CtaBannerBlock, { title: "Subscribe", subtitle: "Every other week.", buttonLabel: "Subscribe", buttonHref: "#", tone: "dark", image: IMG.hero })}
      <PodcastSection eyebrow="Archive" title="Every episode" />
      {kit(ListBlock, { items: [{ text: "A kit list" }, { text: "Sitting between podcast sections" }], style: "bullet" })}
    </>
  ),
};

/** Nested wrappers: Container > Columns > blocks must still land on the page gutter, not 2 or 3 gutters in. */
export const NestedWrappers: Story = {
  render: () => (
    <>
      <PodcastSection eyebrow="Reference" title="A podcast section sets the edge" />
      {kit(ContainerBlock, {
        tone: "none",
        maxWidth: "full",
        content: slot(
          <>
            {kit(HeadingBlock, { text: "Container with no tone", level: "H2" })}
            {kit(ColumnsBlock, {
              distribution: "1:1",
              col1: slot(<Stack title="Left column" />),
              col2: slot(<Stack title="Right column" />),
            })}
          </>,
        ),
      })}
      {list(["A list after the container", "On the same edge"], "check")}
    </>
  ),
};
