import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// The manager chrome uses the site's own palette so the workshop matches the thing
// being built. Values mirror app/podcast.css (keep them in step by hand: the
// manager runs outside the preview iframe and cannot read the tokens).
addons.setConfig({
  theme: create({
    base: "dark",
    brandTitle: "Community + Code design system",
    appBg: "#1c1a19",
    appContentBg: "#262321",
    appPreviewBg: "#1c1a19",
    appBorderColor: "#413c38",
    barBg: "#262321",
    barTextColor: "#c2baaf",
    barSelectedColor: "#e6ae7a",
    textColor: "#e5dfd6",
    textMutedColor: "#c2baaf",
    colorPrimary: "#e6ae7a",
    colorSecondary: "#e6ae7a",
    fontBase: '"Source Sans 3 Variable", system-ui, sans-serif',
    fontCode: '"Victor Mono Variable", ui-monospace, monospace',
  }),
});
