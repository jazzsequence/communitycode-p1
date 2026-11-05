import type { Config } from "@puckeditor/core";

import { puckRoot } from "./components/puck/root";
import { dataListBlock } from "./components/puck/data-list-block";
import { p1Blocks, p1Categories } from "./components/puck/blocks";
import { podcastBlocks, podcastCategories } from "./components/puck/podcast";

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
    ...podcastBlocks,
    DataListBlock: dataListBlock,
  },
} as Config;

export default config;
