import type { Config } from "@puckeditor/core";

import { puckRoot } from "./components/puck/root";
import { dataListBlock } from "./components/puck/data-list-block";
import { p1Blocks, p1Categories } from "./components/puck/blocks";
import { podcastBlocks, podcastCategories } from "./components/puck/podcast";
import { richtextLinkField } from "./lib/rich-link-field";

export const config = {
  categories: {
    // Podcast categories first: they are what an editor reaches for.
    ...podcastCategories,
    ...p1Categories,
    data: {
      title: "Data",
      components: ["DataListBlock"],
    },
  },
  root: puckRoot,
  components: {
    ...p1Blocks,
    // The kit's own Paragraph toolbar cannot link text. Swapped here, not in the kit file,
    // because `shadcn add` overwrites that one.
    Paragraph: { ...p1Blocks.Paragraph, fields: { ...p1Blocks.Paragraph.fields, text: richtextLinkField } },
    ...podcastBlocks,
    DataListBlock: dataListBlock,
  },
} as Config;

export default config;
