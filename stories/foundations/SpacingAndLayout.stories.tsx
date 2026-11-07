import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Foundations/Spacing and layout",
  parameters: {
    docs: {
      description: {
        component:
          "One 8pt-based scale (`--cc-space-1` … `-9`), and a layout contract of three numbers that place content on the page: `--cc-gutter` (16 / 24 / 40px), `--cc-section-y` (48 / 64 / 96px) and `--cc-block-y` (12 / 16px), with content capped at `--cc-content` (72rem) or `--cc-narrow` (48rem). Every top-level block, podcast or P1 kit, follows it. Turn on **Layout guides** in the toolbar: each block's text must touch the magenta lines.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const STEPS: [string, string, string][] = [
  ["--cc-space-1", "4px", "icon gaps"],
  ["--cc-space-2", "8px", "tight stacks"],
  ["--cc-space-3", "12px", "block-y (mobile)"],
  ["--cc-space-4", "16px", "default gap, gutter (mobile)"],
  ["--cc-space-5", "24px", "card gap, gutter (tablet)"],
  ["--cc-space-6", "32px", "form card padding"],
  ["--cc-space-7", "48px", "section-y (mobile)"],
  ["--cc-space-8", "64px", "section-y (tablet)"],
  ["--cc-space-9", "96px", "section-y (desktop)"],
];

export const Scale: Story = {
  render: () => (
    <div className="cc-container cc-section cc-stack">
      {STEPS.map(([token, px, use]) => (
        <div
          key={token}
          style={{
            display: "grid",
            gridTemplateColumns: "12rem 1fr",
            alignItems: "center",
            gap: "var(--cc-space-4)",
          }}
        >
          <code
            style={{
              fontFamily: "var(--cc-font-mono)",
              fontSize: "var(--cc-text-sm)",
            }}
          >
            {token} <span className="cc-muted">{px}</span>
          </code>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--cc-space-3)",
            }}
          >
            <div
              style={{
                width: `var(${token})`,
                height: "var(--cc-space-4)",
                background: "var(--cc-accent)",
                borderRadius: 2,
              }}
            />
            <span
              className="cc-muted"
              style={{ fontSize: "var(--cc-text-sm)" }}
            >
              {use}
            </span>
          </div>
        </div>
      ))}
    </div>
  ),
};

const Band = ({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) => (
  <div
    style={{
      background: "var(--cc-surface)",
      borderBlock: "1px solid var(--cc-border)",
    }}
  >
    <div className="cc-container" style={{ paddingBlock: "var(--cc-space-3)" }}>
      <code
        className="cc-muted"
        style={{
          fontFamily: "var(--cc-font-mono)",
          fontSize: "var(--cc-text-xs)",
        }}
      >
        {label}
      </code>
      {children}
    </div>
  </div>
);

export const LayoutContract: Story = {
  name: "Layout contract (turn guides on)",
  globals: { guides: "on" },
  render: () => (
    <>
      <Band label=".cc-container: gutter inset, content capped at --cc-content" />
      <section className="cc-container cc-section cc-stack">
        <h2 style={{ fontSize: "var(--cc-text-xl)" }}>
          .cc-container .cc-section
        </h2>
        <p className="cc-muted">
          Section padding is --cc-section-y above and below. The heading&rsquo;s
          left edge and this paragraph&rsquo;s right edge sit on the guides.
        </p>
      </section>
      <Band label=".cc-container--narrow: reading width, centered" />
      <section className="cc-container cc-container--narrow cc-section">
        <p>
          Narrow blocks (forms, FAQs, callouts) are centered at --cc-narrow.
          They are the only blocks whose text edge is not on the guides, by
          design: they are narrower, not misaligned.
        </p>
      </section>
    </>
  ),
};
