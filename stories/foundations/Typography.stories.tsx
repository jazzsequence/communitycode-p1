import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Foundations/Typography",
  parameters: {
    docs: {
      description: {
        component:
          "Victor Mono for headings and code, Source Sans 3 for everything you read at length, both carried over from the live site. Mono glyphs are wide, so the heading scale tops out lower than a proportional face would (`--cc-text-2xl` is 2.75rem at most) and headings use weight 600 with -0.02em tracking. Body measure is capped at 68ch.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const SCALE: [string, string, string][] = [
  ["--cc-text-2xl", "Display / h1", "Episode 36: Jacquie Capur"],
  ["--cc-text-xl", "Section / h2", "Latest episodes"],
  ["--cc-text-lg", "Card title / h3", "Docs are a community, too"],
  ["--cc-text-md", "Body", "Everyone remembers their first pull request."],
  ["--cc-text-sm", "Secondary", "Published 16 October 2026 · 57 min"],
  ["--cc-text-xs", "Labels", "Season 2"],
];

export const Scale: Story = {
  render: () => (
    <div className="cc-container cc-section cc-stack">
      {SCALE.map(([token, role, sample]) => (
        <div key={token} style={{ display: "grid", gap: "var(--cc-space-1)" }}>
          <code
            className="cc-muted"
            style={{
              fontFamily: "var(--cc-font-mono)",
              fontSize: "var(--cc-text-xs)",
            }}
          >
            {token} · {role}
          </code>
          <div
            style={{
              fontSize: `var(${token})`,
              fontFamily:
                token === "--cc-text-md" ||
                token === "--cc-text-sm" ||
                token === "--cc-text-xs"
                  ? "var(--cc-font-body)"
                  : "var(--cc-font-display)",
              fontWeight:
                token === "--cc-text-md" ||
                token === "--cc-text-sm" ||
                token === "--cc-text-xs"
                  ? 400
                  : 600,
              lineHeight: 1.2,
              letterSpacing:
                token.includes("xl") || token.includes("lg")
                  ? "-0.02em"
                  : undefined,
            }}
          >
            {sample}
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Prose: Story = {
  render: () => (
    <article className="cc-container cc-section">
      <div className="cc-prose">
        <p className="cc-eyebrow">Show notes</p>
        <h1 style={{ fontSize: "var(--cc-text-2xl)" }}>
          Keeping an open source project alive
        </h1>
        <p>
          Maintainers and contributors want the same thing and still talk past
          each other. This week we get into what each side wishes the other
          would say out loud, with a{" "}
          <a href="#story">link inside running text</a> so you can check how
          links read: they keep a dotted underline at rest and it goes solid on
          hover.
        </p>
        <h2 style={{ fontSize: "var(--cc-text-xl)" }}>What came up</h2>
        <ul>
          <li>Triage is a job, not a favor.</li>
          <li>
            A good first issue is <code>small</code>, <code>scoped</code> and
            has a named person who will answer.
          </li>
          <li>Saying no quickly is kinder than saying nothing slowly.</li>
        </ul>
        <blockquote>
          “The best contribution guide is a maintainer who replies.”
        </blockquote>
        <pre>
          <code>{"npm run storybook   # http://localhost:6006"}</code>
        </pre>
      </div>
    </article>
  ),
};

export const LinkStates: Story = {
  name: "Links (underline on intent)",
  parameters: {
    docs: {
      description: {
        story:
          "UI links (nav, cards, footer) keep the live site's pattern: a transparent underline that turns dotted on hover and focus. Links inside running text keep a persistent dotted underline instead, because link colour against body colour is only ~1.4:1 and colour alone cannot carry a link (WCAG 1.4.1).",
      },
    },
  },
  render: () => (
    <div className="cc-container cc-section cc-stack">
      <p>
        UI link: <a href="#ui">Browse all episodes</a>
      </p>
      <p className="cc-prose">
        Inline link in prose: <a href="#prose">read the transcript</a>.
      </p>
    </div>
  ),
};
