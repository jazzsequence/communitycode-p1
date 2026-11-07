import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { newsletterSignupBlock } from "@/components/puck/podcast/newsletter-signup";
import { withMockApi } from "../_helpers/mock-api";
import { renderBlock } from "../_helpers/render-block";

const ok = withMockApi([["/api/newsletter", () => ({ body: { ok: true } })]]);

// Block props are an open record: each block validates its own, and the stories omit what they don't vary.
type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Newsletter Signup",
  render: (args) => <>{renderBlock(newsletterSignupBlock, args)}</>,
  decorators: [ok],
  parameters: {
    docs: {
      description: {
        component:
          "Email signup card. POSTs `{ email, firstName?, website }` (website = honeypot) to `/api/newsletter`. The success message only ever follows a server 2xx; 501 means \"not configured\" and says so; other failures show the server's `error` text or a generic message. Network is mocked in these stories.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

async function fillAndSubmit(canvasElement: HTMLElement, email: string) {
  const canvas = within(canvasElement);
  const input = await canvas.findByLabelText(/email address/i);
  if (email) await userEvent.type(input, email, { delay: 0 });
  await userEvent.click(canvas.getByRole("button", { name: /subscribe/i }));
}

export const Default: Story = {};

export const WithFirstName: Story = { args: { collectFirstName: true } };

export const NoDescriptionOrNote: Story = { args: { description: "", privacyNote: "" } };

export const Success: Story = {
  play: ({ canvasElement }) => fillAndSubmit(canvasElement, "ada@example.com"),
};

/** Submitting an invalid address: caught client-side, focus returns to the field. */
export const ValidationError: Story = {
  play: ({ canvasElement }) => fillAndSubmit(canvasElement, "not-an-email"),
};

/** The server rejects the address (400 + `{ error }`): its message is shown. */
export const ServerValidationError: Story = {
  decorators: [
    withMockApi([["/api/newsletter", () => ({ status: 400, body: { error: "That address is already subscribed." } })]]),
  ],
  play: ({ canvasElement }) => fillAndSubmit(canvasElement, "ada@example.com"),
};

export const ServerError: Story = {
  decorators: [withMockApi([["/api/newsletter", () => ({ status: 500, body: { error: "" } })]])],
  play: ({ canvasElement }) => fillAndSubmit(canvasElement, "ada@example.com"),
};

/** 501: the backend is not configured. The form never fakes success. */
export const NotConfigured: Story = {
  decorators: [withMockApi([["/api/newsletter", () => ({ status: 501, body: {} })]])],
  play: ({ canvasElement }) => fillAndSubmit(canvasElement, "ada@example.com"),
};

/** The request never resolves: the button is disabled and reads "Subscribing...". */
export const Submitting: Story = {
  decorators: [withMockApi([["/api/newsletter", () => ({ body: { ok: true }, delayMs: 600000 })]])],
  play: ({ canvasElement }) => fillAndSubmit(canvasElement, "ada@example.com"),
};
