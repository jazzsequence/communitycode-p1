"use client";

import { useEffect, useReducer } from "react";
import { Extension, InputRule } from "@tiptap/core";
import type { Field } from "@puckeditor/core";
import { RichTextMenu } from "@puckeditor/core";
import { richtextField } from "@pantheon-systems/puck-css/fields";
import { safeHref } from "@/lib/safe-link";

/**
 * The kit's `richtextField` toolbar has bold/italic/underline and lists, but nothing to take a link or
 * formatting back off. This is the same field with two one-click buttons added, Remove link and Clear
 * formatting, plus a way to ADD a link: type Markdown, `[words](https://…)`, and it becomes a link.
 *
 * Buttons only (no address form): an earlier form-in-the-toolbar version submitted the page instead of
 * the link inside Puck's editor. Stored value is still HTML; `RichValue` sanitises it on render, and the
 * address typed here goes through `safeHref`, so a `javascript:` link is never created.
 */
type RichtextField = Extract<Field, { type: "richtext" }>;
type MenuProps = Parameters<NonNullable<RichtextField["renderMenu"]>>[0];
type EditorLike = NonNullable<MenuProps["editor"]>;

/** `[text](https://…)` typed in the editor becomes a link, so links can be added without a link UI. */
export const MarkdownLink = Extension.create({
  name: "markdownLink",
  addInputRules() {
    return [
      new InputRule({
        find: /\[([^\]\n]+)\]\(([^)\s]+)\)$/,
        handler: ({ state, range, match }) => {
          const link = state.schema.marks.link;
          const href = safeHref(match[2]);
          if (!link || !href) return null; // unsafe or no Link mark: leave the typed text alone
          state.tr.replaceWith(range.from, range.to, state.schema.text(match[1], [link.create({ href })]));
          state.tr.removeStoredMark(link); // what is typed next is not part of the link
        },
      }),
    ];
  },
});

function hasLink(editor: EditorLike): boolean {
  const type = editor.schema.marks.link;
  if (!type) return false;
  const { from, to, empty, $from } = editor.state.selection;
  return empty ? !!type.isInSet($from.marks()) : editor.state.doc.rangeHasMark(from, to, type);
}

const svg = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const UnlinkIcon = () => (
  <svg {...svg}>
    <path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" />
    <path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" />
    <line x1="8" x2="8" y1="2" y2="5" />
    <line x1="2" x2="5" y1="8" y2="8" />
    <line x1="16" x2="16" y1="19" y2="22" />
    <line x1="19" x2="22" y1="16" y2="16" />
  </svg>
);

const ClearIcon = () => (
  <svg {...svg}>
    <path d="M4 7V4h16v3" />
    <path d="M5 20h6" />
    <path d="M13 4 8 20" />
    <path d="m15 15 5 5" />
    <path d="m20 15-5 5" />
  </svg>
);

function Menu({ editor, withLists }: { editor: MenuProps["editor"]; withLists: boolean }) {
  // Puck re-renders this only when its own selector state changes (bold, lists...), not when the
  // selection moves, so "is there a link here?" would go stale. Follow the editor directly.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!editor) return;
    editor.on("transaction", refresh);
    return () => {
      editor.off("transaction", refresh);
    };
  }, [editor]);

  return (
    <RichTextMenu>
      <RichTextMenu.Group>
        <RichTextMenu.Bold />
        <RichTextMenu.Italic />
        <RichTextMenu.Underline />
      </RichTextMenu.Group>
      <RichTextMenu.Group>
        <RichTextMenu.Control
          icon={<UnlinkIcon />}
          title="Remove link"
          disabled={!editor || !hasLink(editor)}
          onClick={(e) => {
            e.stopPropagation();
            // Works on the whole link when the caret is inside it, or on just the selected part.
            editor?.chain().focus().unsetLink().run();
          }}
        />
        <RichTextMenu.Control
          icon={<ClearIcon />}
          title="Clear formatting"
          disabled={!editor}
          onClick={(e) => {
            e.stopPropagation();
            editor?.chain().focus().unsetLink().unsetAllMarks().clearNodes().run();
          }}
        />
      </RichTextMenu.Group>
      {withLists ? (
        <RichTextMenu.Group>
          <RichTextMenu.BulletList />
          <RichTextMenu.OrderedList />
        </RichTextMenu.Group>
      ) : null}
    </RichTextMenu>
  );
}

const InlineMenu = ({ editor }: MenuProps) => <Menu editor={editor} withLists={false} />;
const FullMenu = ({ editor }: MenuProps) => <Menu editor={editor} withLists />;

export const richtextLinkField: RichtextField = {
  ...(richtextField as RichtextField),
  // Clicking a link while editing should place the cursor, not navigate away from the editor.
  options: { ...(richtextField as RichtextField).options, link: { openOnClick: false } },
  tiptap: { extensions: [MarkdownLink] },
  renderMenu: FullMenu,
  renderInlineMenu: InlineMenu,
};
