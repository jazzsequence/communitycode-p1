import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { contactFormBlock } from "@/components/puck/podcast/contact-form";
import { withMockApi } from "../_helpers/mock-api";
import { renderBlock } from "../_helpers/render-block";

// Block props are an open record: each block validates its own, and the stories omit what they don't vary.
type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Contact Form",
  render: (args) => <>{renderBlock(contactFormBlock, args)}</>,
  decorators: [withMockApi([["/api/contact", () => ({ body: { ok: true } })]])],
  parameters: {
    docs: {
      description: {
        component:
          "Name, email and message form. POSTs `{ name, email, message, website }` (website = honeypot) to `/api/contact`. Field errors are announced and focus moves to the first bad field; on any server failure the form stays filled in so nothing is lost; 501 means \"not configured\". Network is mocked in these stories.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

async function fill(canvasElement: HTMLElement, values: { name?: string; email?: string; message?: string }, submit = true) {
  const canvas = within(canvasElement);
  const name = await canvas.findByRole("textbox", { name: "Name" });
  if (values.name) await userEvent.type(name, values.name, { delay: 0 });
  if (values.email) await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), values.email, { delay: 0 });
  if (values.message) await userEvent.type(canvas.getByRole("textbox", { name: "Message" }), values.message, { delay: 0 });
  if (submit) await userEvent.click(canvas.getByRole("button", { name: /send message/i }));
}

const valid = { name: "Ada Moreno", email: "ada@example.com", message: "Loved the episode on maintainers. Could we talk about funding next?" };

export const Default: Story = {};

export const NoDescriptionOrNote: Story = { args: { description: "", privacyNote: "" } };

/** Filled in but not yet sent. */
export const Filled: Story = { play: ({ canvasElement }) => fill(canvasElement, valid, false) };

export const Success: Story = { play: ({ canvasElement }) => fill(canvasElement, valid) };

/** Submit empty: one error per field, focus on the first. */
export const ValidationErrors: Story = { play: ({ canvasElement }) => fill(canvasElement, {}) };

/** Name and message fine, email malformed. */
export const InvalidEmail: Story = {
  play: ({ canvasElement }) => fill(canvasElement, { ...valid, email: "ada-at-example" }),
};

export const ServerError: Story = {
  decorators: [withMockApi([["/api/contact", () => ({ status: 500, body: {} })]])],
  play: ({ canvasElement }) => fill(canvasElement, valid),
};

/** The server rejects the message with its own `{ error }` text. */
export const ServerRejected: Story = {
  decorators: [withMockApi([["/api/contact", () => ({ status: 429, body: { error: "Too many messages. Try again in a few minutes." } })]])],
  play: ({ canvasElement }) => fill(canvasElement, valid),
};

/** 501: not configured. */
export const NotConfigured: Story = {
  decorators: [withMockApi([["/api/contact", () => ({ status: 501, body: {} })]])],
  play: ({ canvasElement }) => fill(canvasElement, valid),
};

export const Submitting: Story = {
  decorators: [withMockApi([["/api/contact", () => ({ body: { ok: true }, delayMs: 600000 })]])],
  play: ({ canvasElement }) => fill(canvasElement, valid),
};
