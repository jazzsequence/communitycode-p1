import type { StorybookConfig } from "@storybook/nextjs-vite";

/**
 * Storybook for the Community + Code design system. It renders the real
 * components against the real stylesheet (app/styles.css), so a story that looks
 * right here looks right on the site. Run: `npm run storybook` (port 6006).
 */
const config: StorybookConfig = {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
};

export default config;
