"use client";

import type { Field } from "@puckeditor/core";
import { RichTextMenu } from "@puckeditor/core";
import { richtextField } from "@pantheon-systems/puck-css/fields";
import { safeHref } from "@/lib/safe-link";

/**
 * The kit's `richtextField` toolbar has bold/italic/underline and lists but no way to link text, even
 * though Puck's editor has the Link extension on. This is the same field with a Link button added,
 * in both the sidebar toolbar and the small bubble that appears when editing on the canvas.
 *
 * Stored value is still HTML; `RichValue` sanitises it on render, and the URL typed here goes through
 * `safeHref` first so a `javascript:` link is never stored in the first place.
 */
type RichtextField = Extract<Field, { type: "richtext" }>;
type MenuProps = Parameters<NonNullable<RichtextField["renderMenu"]>>[0];
type EditorLike = NonNullable<MenuProps["editor"]>;

const PROMPT = "Link address (https://…, /page, or mailto:…). Leave empty to remove the link.";

function setLink(editor: EditorLike) {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const input = window.prompt(PROMPT, current);
  if (input === null) return; // cancelled
  const value = input.trim();
  if (!value) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  const href = safeHref(value);
  if (!href) return; // unsafe or malformed: leave the text as it was
  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function LinkControl({ editor }: { editor: MenuProps["editor"] }) {
  if (!editor) return null;
  const active = editor.isActive("link");
  return (
    <RichTextMenu.Control
      icon={<LinkIcon />}
      title={active ? "Edit link" : "Link"}
      active={active}
      // Linking needs words to link; an existing link can always be edited or removed.
      disabled={editor.state.selection.empty && !active}
      onClick={(e) => {
        e.stopPropagation();
        setLink(editor);
      }}
    />
  );
}

function InlineMenu({ editor }: MenuProps) {
  return (
    <RichTextMenu>
      <RichTextMenu.Group>
        <RichTextMenu.Bold />
        <RichTextMenu.Italic />
        <RichTextMenu.Underline />
        <LinkControl editor={editor} />
      </RichTextMenu.Group>
    </RichTextMenu>
  );
}

function FullMenu({ editor }: MenuProps) {
  return (
    <RichTextMenu>
      <RichTextMenu.Group>
        <RichTextMenu.Bold />
        <RichTextMenu.Italic />
        <RichTextMenu.Underline />
        <LinkControl editor={editor} />
      </RichTextMenu.Group>
      <RichTextMenu.Group>
        <RichTextMenu.BulletList />
        <RichTextMenu.OrderedList />
      </RichTextMenu.Group>
    </RichTextMenu>
  );
}

export const richtextLinkField: RichtextField = {
  ...(richtextField as RichtextField),
  // Clicking a link while editing should place the cursor, not navigate away from the editor.
  options: { ...(richtextField as RichtextField).options, link: { openOnClick: false } },
  renderMenu: FullMenu,
  renderInlineMenu: InlineMenu,
};
