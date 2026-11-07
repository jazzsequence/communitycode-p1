import type { Decorator, Preview } from "@storybook/nextjs-vite";
import "../app/styles.css";
import "./preview.css";

/**
 * Every story renders inside `.cc-root`, exactly as components/puck/root.tsx
 * wraps a real page: the design tokens are scoped to that wrapper, not <body>.
 * `min-height: 0` undoes the site's 100vh so docs-page canvases stay compact.
 */
const withRoot: Decorator = (Story, context) => (
  <div
    className="cc-root sb-root"
    data-guides={context.globals.guides === "on" ? "on" : undefined}
    style={{ minHeight: 0 }}
  >
    <Story />
  </div>
);

const preview: Preview = {
  decorators: [withRoot],
  globalTypes: {
    guides: {
      description: "Show the gutter and content-width guides",
      toolbar: {
        title: "Layout guides",
        icon: "ruler",
        items: [
          { value: "off", title: "Guides off" },
          { value: "on", title: "Guides on" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { guides: "off", backgrounds: { value: "site" } },
  parameters: {
    layout: "fullscreen",
    // The site is always dark; the canvas background must match or an editor sees
    // a white flash around a dark story.
    backgrounds: { options: { site: { name: "Site", value: "#1c1a19" } } },
    a11y: { test: "error" },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    docs: { toc: true },
  },
  tags: ["autodocs"],
};

export default preview;
