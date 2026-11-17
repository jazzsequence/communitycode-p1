"use client";

import { useEffect, useReducer } from "react";
import type { Field } from "@puckeditor/core";
import { RichTextMenu } from "@puckeditor/core";
import { richtextField } from "@pantheon-systems/puck-css/fields";
import { safeHref } from "@/lib/safe-link";

/**
 * The kit's `richtextField` toolbar has bold/italic/underline and lists, but nothing to take a link or
 * formatting back off. This is the same field with two one-click buttons added, Remove link and Clear
 * formatting, plus a way to ADD a link: type Markdown, `[words](https://…)`, and it becomes a link.
 *
 * Deliberately imports nothing from tiptap. Every tiptap package peer-pins the exact version of the others,
 * so a direct dependency of ours would have to move in lockstep with Puck's and breaks the next Puck
 * upgrade (npm ERESOLVE). Everything here works through the `editor` Puck hands to the menu instead.
 *
 * Buttons only (no address form): an earlier form-in-the-toolbar version submitted the page instead of
 * the link inside Puck's editor. Stored value is still HTML; `RichValue` sanitises it on render, and the
 * address typed here goes through `safeHref`, so a `javascript:` link is never created.
 */
type RichtextField = Extract<Field, { type: "richtext" }>;
type MenuProps = Parameters<NonNullable<RichtextField["renderMenu"]>>[0];
type EditorLike = NonNullable<MenuProps["editor"]>;

const MARKDOWN_LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)$/;

/**
 * If the text just before the caret is `[words](address)`, replace it with `words` as a link. Returns
 * whether it did. An unsafe address (`javascript:` and friends) is left as typed text.
 */
export function convertMarkdownLink(editor: EditorLike): boolean {
  const { selection } = editor.state;
  const link = editor.schema.marks.link;
  if (!selection.empty || !link) return false;
  const { $from } = selection;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  if (!before.endsWith(")")) return false;
  const m = MARKDOWN_LINK.exec(before);
  const href = m ? safeHref(m[2]) : null;
  if (!m || !href) return false;
  const start = $from.start() + m.index;
  return editor
    .chain()
    .deleteRange({ from: start, to: selection.from })
    .insertContent({ type: "text", text: m[1], marks: [{ type: "link", attrs: { href } }] })
    .run();
}

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
    // Typing the closing bracket of [words](https://…) makes it a link. Done after the keystroke lands,
    // from the menu's own subscription, so no tiptap extension is needed.
    const onUpdate = () => {
      convertMarkdownLink(editor);
    };
    editor.on("transaction", refresh);
    editor.on("update", onUpdate);
    return () => {
      editor.off("transaction", refresh);
      editor.off("update", onUpdate);
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
  renderMenu: FullMenu,
  renderInlineMenu: InlineMenu,
};
