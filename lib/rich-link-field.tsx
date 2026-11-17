"use client";

import { useEffect, useRef, useState } from "react";
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

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * The address field sits under the toolbar instead of a `window.prompt`: a native dialog is easy to
 * miss or have suppressed, freezes the page while open, and cannot be styled or tested.
 * The selection is captured when the form opens, because focusing the input blurs the editor.
 */
function LinkForm({ editor, onDone }: { editor: EditorLike; onDone: () => void }) {
  const range = useRef({ from: editor.state.selection.from, to: editor.state.selection.to });
  const hadLink = useRef(editor.isActive("link"));
  const [value, setValue] = useState<string>((editor.getAttributes("link").href as string | undefined) ?? "");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.select(), []);

  const select = () => editor.chain().focus().setTextSelection(range.current).extendMarkRange("link");
  const apply = () => {
    const href = safeHref(value);
    if (!href) {
      setError("Use https://…, /page or mailto:…");
      return;
    }
    select().setLink({ href }).run();
    onDone();
  };
  const remove = () => {
    select().unsetLink().run();
    onDone();
  };

  return (
    <form
      aria-label="Link address"
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "6px 8px" }}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        apply();
      }}
      onKeyDown={(e) => {
        e.stopPropagation(); // keep Puck/tiptap shortcuts out of the input
        if (e.key === "Escape") onDone();
      }}
    >
      <input
        ref={input}
        type="text"
        inputMode="url"
        value={value}
        placeholder="https://… or /page"
        aria-label="Link address"
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          setError("");
        }}
        style={{ flex: "1 1 10rem", minWidth: 0, padding: "4px 6px", font: "inherit", fontSize: 13 }}
      />
      <button type="submit" style={{ font: "inherit", fontSize: 13, padding: "4px 8px", cursor: "pointer" }}>
        Apply
      </button>
      {hadLink.current ? (
        <button type="button" onClick={remove} style={{ font: "inherit", fontSize: 13, padding: "4px 8px", cursor: "pointer" }}>
          Remove
        </button>
      ) : null}
      {error ? (
        <span role="alert" style={{ flexBasis: "100%", fontSize: 12 }}>
          {error}
        </span>
      ) : null}
    </form>
  );
}

/** The toolbar, plus the address form when the Link button is open. Hooks live here, not in Puck's callbacks. */
function LinkMenu({ editor, withLists }: { editor: MenuProps["editor"]; withLists: boolean }) {
  const [open, setOpen] = useState(false);
  const active = !!editor?.isActive("link");
  return (
    <>
      <RichTextMenu>
        <RichTextMenu.Group>
          <RichTextMenu.Bold />
          <RichTextMenu.Italic />
          <RichTextMenu.Underline />
          <RichTextMenu.Control
            icon={<LinkIcon />}
            title={active ? "Edit link" : "Link"}
            active={active || open}
            // Linking needs words to link; an existing link can always be edited or removed.
            disabled={!editor || (editor.state.selection.empty && !active)}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
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
      {open && editor ? <LinkForm editor={editor} onDone={() => setOpen(false)} /> : null}
    </>
  );
}

const InlineMenu = ({ editor }: MenuProps) => <LinkMenu editor={editor} withLists={false} />;
const FullMenu = ({ editor }: MenuProps) => <LinkMenu editor={editor} withLists />;

export const richtextLinkField: RichtextField = {
  ...(richtextField as RichtextField),
  // Clicking a link while editing should place the cursor, not navigate away from the editor.
  options: { ...(richtextField as RichtextField).options, link: { openOnClick: false } },
  renderMenu: FullMenu,
  renderInlineMenu: InlineMenu,
};
