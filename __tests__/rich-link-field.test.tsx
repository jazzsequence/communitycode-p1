// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Link } from "@tiptap/extension-link";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { afterEach, describe, expect, it, vi } from "vitest";
import { richtextLinkField } from "@/lib/rich-link-field";

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
  new Editor({ element: document.createElement("div"), extensions: [Document, Paragraph, Text, Link.configure({ openOnClick: false })], content: html });

function open(editor: Editor, from: number, to: number) {
  editor.commands.setTextSelection({ from, to });
  const Menu = richtextLinkField.renderMenu!;
  render(<Menu editor={editor} editorState={null} readOnly={false}>{null}</Menu>);
}

describe("richtextLinkField", () => {
  it("is a richtext field with a Link toolbar in both menus and clicks that do not navigate", () => {
    expect(richtextLinkField.type).toBe("richtext");
    expect(richtextLinkField.renderMenu).toBeTypeOf("function");
    expect(richtextLinkField.renderInlineMenu).toBeTypeOf("function");
    expect(richtextLinkField.options?.link).toMatchObject({ openOnClick: false });
  });

  it("links the selected words from an inline form, with no browser dialog", () => {
    const prompt = vi.spyOn(window, "prompt");
    const editor = makeEditor("<p>hello world</p>");
    open(editor, 1, 6); // "hello"
    fireEvent.click(screen.getByTitle("Link"));
    fireEvent.change(screen.getByLabelText("Link address", { selector: "input" }), { target: { value: "https://x.test" } });
    fireEvent.click(screen.getByText("Apply"));
    expect(editor.getHTML()).toContain('<a target="_blank" rel="noopener noreferrer nofollow" href="https://x.test">hello</a> world');
    expect(prompt).not.toHaveBeenCalled();
    // The form closes once applied.
    expect(screen.queryByText("Apply")).toBeNull();
  });

  it("refuses an unsafe address, says why, and leaves the text alone", () => {
    const editor = makeEditor("<p>hello world</p>");
    open(editor, 1, 6);
    fireEvent.click(screen.getByTitle("Link"));
    fireEvent.change(screen.getByLabelText("Link address", { selector: "input" }), { target: { value: "javascript:alert(1)" } });
    fireEvent.click(screen.getByText("Apply"));
    expect(screen.getByRole("alert").textContent).toMatch(/https/);
    expect(editor.getHTML()).toBe("<p>hello world</p>");
  });

  it("edits and removes an existing link", () => {
    const editor = makeEditor('<p><a href="https://old.test">hello</a> world</p>');
    open(editor, 2, 2); // caret inside the link: no selection needed to edit it
    fireEvent.click(screen.getByTitle("Edit link"));
    const field = screen.getByLabelText("Link address", { selector: "input" }) as HTMLInputElement;
    expect(field.value).toBe("https://old.test");
    fireEvent.click(screen.getByText("Remove"));
    expect(editor.getHTML()).toBe("<p>hello world</p>");
  });

  it("disables the button when nothing is selected and there is no link to edit", () => {
    const editor = makeEditor("<p>hello world</p>");
    open(editor, 3, 3);
    expect((screen.getByTitle("Link") as HTMLButtonElement).disabled).toBe(true);
  });

  it("still renders the button before the editor exists (disabled), instead of vanishing", () => {
    const Menu = richtextLinkField.renderMenu!;
    render(<Menu editor={null} editorState={null} readOnly={false}>{null}</Menu>);
    expect((screen.getByTitle("Link") as HTMLButtonElement).disabled).toBe(true);
  });
});
