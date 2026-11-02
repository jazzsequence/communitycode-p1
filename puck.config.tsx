import type { Config } from "@puckeditor/core";

import { puckRoot } from "./components/puck/root";
import { welcomeBlock } from "./components/puck/welcome-block";
import { dataListBlock } from "./components/puck/data-list-block";
import { p1Blocks, p1Categories } from "./components/puck/blocks";

export const config = {
  categories: {
    ...p1Categories,
    data: {
      title: "Data",
      components: ["DataListBlock"],
    },
    pages: {
      title: "Page Sections",
      components: ["P1WelcomeBlock"],
    },
  },
  root: puckRoot,
  components: {
    ...p1Blocks,
    DataListBlock: dataListBlock,
    P1WelcomeBlock: welcomeBlock,
  },
} as Config;

export default config;
