"use client";

import { createDataListBlock } from "@pantheon-systems/puck-css/fields";
import { blockPaddingClass } from "../block-padding";

// Labelled "Data List" so it stays distinct from the library's List block when
// both are registered; a component's label is what the drawer shows.
export const dataListBlock = {
  ...createDataListBlock({
    wrapperClassName: blockPaddingClass,
  }),
  label: "Data List",
};
