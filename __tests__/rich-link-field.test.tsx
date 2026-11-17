// @vitest-environment jsdom
// These tiptap extensions are Puck's own dependencies (what its editor is built from); the test builds a
// real editor from them so the toolbar actions run against ProseMirror, not a mock.
/* eslint-disable import/no-extraneous-dependencies */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { Bold } from "@tiptap/extension-bold";
import { Document } from "@tiptap/extension-document";
import { Link } from "@tiptap/extension-link";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarkdownLink, richtextLinkField } from "@/lib/rich-link-field";

// Puck's real menu needs its editor context; the buttons here only need to be clickable.
vi.mock("@puckeditor/core", () => {
  const Group = ({ children }: { children?: unknown }) => <div>{children as never}</div>;
  const Menu = Object.assign(Group, {
    Group,
    Control: ({ title, onClick, disabled }: { title: string; onClick: (e: unknown) => void; disabled?: boolean }) => (
      <button type="button" title={title} disabled={disabled} onClick={onClick}>
        {title}
      </button>
    ),
    Bold: () => null,
    Italic: () => null,
    Underline: () => null,
    BulletList: () => null,
    OrderedList: () => null,
  });
  return { RichTextMenu: Menu };
});
vi.mock("@pantheon-systems/puck-css/fields", () => ({ richtextField: { type: "richtext", options: { textAlign: false } } }));

afterEach(cleanup);

const makeEditor = (html: string) =>
  new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, Bold, Link.configure({ openOnClick: false }), MarkdownLink],
    content: html,
  });

function show(editor: Editor) {
  const Menu = richtextLinkField.renderMenu!;
  render(<Menu editor={editor} editorState={null} readOnly={false}>{null}</Menu>);
}

/** Type like a keyboard does, so ProseMirror's input rules run. */
function type(editor: Editor, text: string) {
  for (const ch of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp("handleTextInput", (f) => f(editor.view, from, to, ch, () => editor.state.tr.insertText(ch, from, to)));
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(ch, from, to));
  }
}

const LINKED = '<p>see <a href="https://old.test">the old page</a> now</p>';

describe("richtextLinkField toolbar", () => {
  it("is a richtext field that does not navigate on click and offers both menus", () => {
    expect(richtextLinkField.type).toBe("richtext");
    expect(richtextLinkField.renderMenu).toBeTypeOf("function");
    expect(richtextLinkField.renderInlineMenu).toBeTypeOf("function");
    expect(richtextLinkField.options?.link).toMatchObject({ openOnClick: false });
    expect(richtextLinkField.tiptap?.extensions).toContain(MarkdownLink);
  });

  it("removes the whole link when the caret is inside it", () => {
    const editor = makeEditor(LINKED);
    editor.commands.setTextSelection(8); // inside "the old page"
    show(editor);
    fireEvent.click(screen.getByTitle("Remove link"));
    expect(editor.getHTML()).toBe("<p>see the old page now</p>");
  });

  it("removes only the selected part of a link", () => {
    const editor = makeEditor(LINKED);
    editor.commands.setTextSelection({ from: 5, to: 8 }); // "the"
    show(editor);
    fireEvent.click(screen.getByTitle("Remove link"));
    const dom = new DOMParser().parseFromString(editor.getHTML(), "text/html");
    expect([...dom.querySelectorAll("a")].map((a) => a.textContent)).toEqual([" old page"]); // "the" is no longer linked
    expect(dom.body.textContent).toBe("see the old page now");
  });

  it("disables Remove link where there is no link, and follows the selection as it moves", () => {
    const editor = makeEditor(LINKED);
    editor.commands.setTextSelection(2); // "see", not linked
    show(editor);
    expect((screen.getByTitle("Remove link") as HTMLButtonElement).disabled).toBe(true);
    act(() => {
      editor.commands.setTextSelection(8); // Puck does not re-render the menu for this
    });
    expect((screen.getByTitle("Remove link") as HTMLButtonElement).disabled).toBe(false);
    act(() => {
      editor.commands.setTextSelection(2);
    });
    expect((screen.getByTitle("Remove link") as HTMLButtonElement).disabled).toBe(true);
  });

  it("clears bold and links from the selection", () => {
    const editor = makeEditor('<p><strong>loud</strong> and <a href="https://old.test">linked</a></p>');
    editor.commands.selectAll();
    show(editor);
    fireEvent.click(screen.getByTitle("Clear formatting"));
    expect(editor.getHTML()).toBe("<p>loud and linked</p>");
  });

  it("renders the buttons (disabled) before the editor exists", () => {
    const Menu = richtextLinkField.renderMenu!;
    render(<Menu editor={null} editorState={null} readOnly={false}>{null}</Menu>);
    expect((screen.getByTitle("Remove link") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTitle("Clear formatting") as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("typing Markdown links", () => {
  it("turns [words](https://…) into a link as the closing bracket is typed", () => {
    const editor = makeEditor("<p></p>");
    editor.commands.focus("end");
    type(editor, "Read [the manifesto](https://communitycode.dev/m/) now");
    const dom = new DOMParser().parseFromString(editor.getHTML(), "text/html");
    const a = dom.querySelector("a");
    expect(a?.getAttribute("href")).toBe("https://communitycode.dev/m/");
    expect(dom.body.textContent).toBe("Read the manifesto now"); // the Markdown syntax is gone
    expect(dom.querySelectorAll("a")).toHaveLength(1); // text typed after the link is not part of it
  });

  it("accepts a same-site path and mailto", () => {
    const editor = makeEditor("<p></p>");
    editor.commands.focus("end");
    type(editor, "[about](/about) [mail](mailto:a@b.test)");
    expect(editor.getHTML()).toContain('href="/about"');
    expect(editor.getHTML()).toContain('href="mailto:a@b.test"');
  });

  it("does not turn an unsafe address into a link and leaves what was typed", () => {
    const editor = makeEditor("<p></p>");
    editor.commands.focus("end");
    type(editor, "[click](javascript:alert(1))");
    expect(editor.getHTML()).not.toContain("<a");
    expect(editor.getHTML()).toContain("[click](javascript:alert(1");
  });
});
