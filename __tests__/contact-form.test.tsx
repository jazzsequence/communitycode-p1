// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactFormView, contactFormBlock } from "@/components/puck/podcast/contact-form";
import { podcastBlocks, podcastCategories } from "@/components/puck/podcast";

const props = { ...contactFormBlock.defaultProps };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const nameInput = () => screen.getByLabelText("Name") as HTMLInputElement;
const emailInput = () => screen.getByLabelText("Email address") as HTMLInputElement;
const messageInput = () => screen.getByLabelText("Message") as HTMLTextAreaElement;
const submitBtn = () => screen.getByRole("button", { name: /send message|sending/i }) as HTMLButtonElement;
const errorFor = (el: HTMLElement) => document.getElementById(el.getAttribute("aria-describedby")!)!;
const summaryAlert = () => document.querySelector<HTMLElement>(".cc-form__error--summary")!;

async function fillValid() {
  await userEvent.type(nameInput(), "Ada Lovelace");
  await userEvent.type(emailInput(), "ada@example.com");
  await userEvent.type(messageInput(), "Hello there");
}

describe("ContactForm", () => {
  it("renders labelled fields, heading, description and privacy note", () => {
    render(<ContactFormView {...props} />);
    expect(screen.getByRole("heading", { level: 2, name: props.heading })).toBeTruthy();
    expect(screen.getByText(props.description)).toBeTruthy();
    expect(nameInput().autocomplete).toBe("name");
    expect(emailInput().type).toBe("email");
    expect(messageInput().tagName).toBe("TEXTAREA");
    for (const el of [nameInput(), emailInput(), messageInput()]) expect(el.getAttribute("aria-required")).toBe("true");
    expect(screen.getByText(props.privacyNote)).toBeTruthy();
  });

  it("uses the label props", () => {
    render(<ContactFormView {...props} nameLabel="Your name" emailLabel="Your email" messageLabel="Your note" submitLabel="Go" />);
    expect(screen.getByLabelText("Your name")).toBeTruthy();
    expect(screen.getByLabelText("Your email")).toBeTruthy();
    expect(screen.getByLabelText("Your note")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go" })).toBeTruthy();
  });

  it("flags every empty field inline, focuses the first, and doesn't call the API", async () => {
    render(<ContactFormView {...props} />);
    await userEvent.click(submitBtn());

    for (const el of [nameInput(), emailInput(), messageInput()]) {
      expect(el.getAttribute("aria-invalid")).toBe("true");
      const err = errorFor(el);
      expect(err.getAttribute("role")).toBe("alert");
      expect(err.textContent).not.toBe("");
    }
    expect(errorFor(nameInput()).textContent).toMatch(/name/i);
    expect(errorFor(emailInput()).textContent).toMatch(/valid email/i);
    expect(errorFor(messageInput()).textContent).toMatch(/message/i);
    expect(document.activeElement).toBe(nameInput());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(props.successMessage)).toBeNull();
  });

  it("focuses the first invalid field and clears an error when that field is edited", async () => {
    render(<ContactFormView {...props} />);
    await userEvent.type(nameInput(), "Ada");
    await userEvent.type(emailInput(), "not-an-email");
    await userEvent.type(messageInput(), "Hi");
    await userEvent.click(submitBtn());

    expect(document.activeElement).toBe(emailInput());
    expect(emailInput().getAttribute("aria-invalid")).toBe("true");
    expect(nameInput().getAttribute("aria-invalid")).toBeNull();
    expect(nameInput().getAttribute("aria-describedby")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.type(emailInput(), "x");
    expect(emailInput().getAttribute("aria-invalid")).toBeNull();
    expect(emailInput().getAttribute("aria-describedby")).toBeNull();
  });

  it("treats whitespace-only fields as empty", async () => {
    render(<ContactFormView {...props} />);
    await userEvent.type(nameInput(), "   ");
    await userEvent.type(emailInput(), "ada@example.com");
    await userEvent.type(messageInput(), "   ");
    await userEvent.click(submitBtn());
    expect(nameInput().getAttribute("aria-invalid")).toBe("true");
    expect(messageInput().getAttribute("aria-invalid")).toBe("true");
    expect(emailInput().getAttribute("aria-invalid")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits the trimmed payload, then replaces the form with the success message in a live region", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    render(<ContactFormView {...props} successMessage="Sent!" />);
    await userEvent.type(nameInput(), "  Ada Lovelace ");
    await userEvent.type(emailInput(), " ada@example.com ");
    await userEvent.type(messageInput(), "Hello there ");
    await userEvent.click(submitBtn());

    const msg = await screen.findByText("Sent!");
    expect(msg.closest("[role='status']")?.getAttribute("aria-live")).toBe("polite");
    expect(screen.queryByLabelText("Email address")).toBeNull();
    expect(screen.queryByRole("button", { name: /send message/i })).toBeNull();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/contact");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "Hello there",
      website: "",
    });
    await waitFor(() => expect(document.activeElement).toBe(msg.closest("[role='status']")));
  });

  it("keeps everything typed and shows the server's message on failure", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "We couldn't send it." }, { status: 502 }));
    render(<ContactFormView {...props} />);
    await fillValid();
    await userEvent.click(submitBtn());

    await waitFor(() => expect(summaryAlert().textContent).toBe("We couldn't send it."));
    expect(screen.queryByText(props.successMessage)).toBeNull();
    expect(nameInput().value).toBe("Ada Lovelace");
    expect(emailInput().value).toBe("ada@example.com");
    expect(messageInput().value).toBe("Hello there");
    expect(submitBtn().disabled).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(submitBtn()));
  });

  it("says plainly it isn't available on a 501, and never shows success", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Contact form isn't configured yet." }, { status: 501 }));
    render(<ContactFormView {...props} />);
    await fillValid();
    await userEvent.click(submitBtn());
    await waitFor(() => expect(summaryAlert().textContent).toMatch(/isn't available yet/i));
    expect(screen.queryByText(props.successMessage)).toBeNull();
    expect(messageInput().value).toBe("Hello there");
  });

  it("uses a generic message when the error body is unreadable", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 502 }));
    render(<ContactFormView {...props} />);
    await fillValid();
    await userEvent.click(submitBtn());
    await waitFor(() => expect(summaryAlert().textContent).toMatch(/couldn't send your message/i));
  });

  it("keeps the input on a network failure, and can be retried to success", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    render(<ContactFormView {...props} />);
    await fillValid();
    await userEvent.click(submitBtn());
    await waitFor(() => expect(summaryAlert().textContent).toMatch(/couldn't reach the server/i));
    expect(messageInput().value).toBe("Hello there");

    await userEvent.click(submitBtn());
    await screen.findByText(props.successMessage);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string).message).toBe("Hello there");
  });

  it("disables the button and marks the form busy while sending; can't double submit", async () => {
    const d = deferred<Response>();
    fetchMock.mockReturnValueOnce(d.promise);
    render(<ContactFormView {...props} />);
    await fillValid();

    await userEvent.click(submitBtn());
    expect(submitBtn().disabled).toBe(true);
    expect(submitBtn().getAttribute("aria-busy")).toBe("true");
    expect(submitBtn().textContent).toBe("Sending…");
    expect(document.querySelector("form")!.getAttribute("aria-busy")).toBe("true");

    await userEvent.click(submitBtn());
    await userEvent.type(emailInput(), "{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    d.resolve(Response.json({ ok: true }));
    await screen.findByText(props.successMessage);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the honeypot out of sight, the tab order and the accessibility tree", async () => {
    render(<ContactFormView {...props} />);
    const honeypot = document.querySelector<HTMLInputElement>("input[name='website']")!;
    expect(honeypot.getAttribute("tabindex")).toBe("-1");
    expect(honeypot.getAttribute("autocomplete")).toBe("off");
    const wrapper = honeypot.closest("[aria-hidden='true']")!;
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toContain("cc-form__honeypot");
    expect(screen.queryAllByRole("textbox", { name: /empty/i })).toHaveLength(0);

    const visited: Element[] = [];
    await userEvent.tab();
    for (let i = 0; i < 6; i++) {
      visited.push(document.activeElement!);
      await userEvent.tab();
    }
    expect(visited).not.toContain(honeypot);
    expect(visited).toContain(messageInput());
  });

  it("passes a filled honeypot to the server (which drops it)", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    render(<ContactFormView {...props} />);
    const honeypot = document.querySelector<HTMLInputElement>("input[name='website']")!;
    await fillValid();
    fireEvent.change(honeypot, { target: { value: "http://spam.example" } });
    await userEvent.click(submitBtn());
    await screen.findByText(props.successMessage);
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).website).toBe("http://spam.example");
  });
});

describe("ContactForm endpoint field", () => {
  async function submitTo(endpoint: string) {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    render(<ContactFormView {...props} endpoint={endpoint} />);
    await fillValid();
    await userEvent.click(submitBtn());
    await screen.findByText(props.successMessage);
    return fetchMock.mock.calls[0][0] as string;
  }

  it("posts to the custom endpoint", async () => {
    expect(await submitTo("https://api.example.org/contact?form=7")).toBe("https://api.example.org/contact?form=7");
  });

  it.each(["javascript:alert(1)", "//evil.example/x", ""])("falls back to the default for %j", async (endpoint) => {
    expect(await submitTo(endpoint)).toBe("/api/contact");
  });
});

describe("contactFormBlock config", () => {
  it("declares the editor fields and defaults the endpoint from the shared defaults", () => {
    expect(Object.keys(contactFormBlock.fields)).toEqual([
      "heading",
      "endpoint",
      "description",
      "nameLabel",
      "emailLabel",
      "messageLabel",
      "submitLabel",
      "successMessage",
      "privacyNote",
    ]);
    expect(contactFormBlock.fields.endpoint.type).toBe("text");
    expect(contactFormBlock.defaultProps.endpoint).toBe("/api/contact");
  });

  it("renders with missing props (older page content) using the defaults", () => {
    render(contactFormBlock.render({}));
    expect(screen.getByRole("heading", { level: 2, name: contactFormBlock.defaultProps.heading })).toBeTruthy();
    expect(submitBtn()).toBeTruthy();
  });

  it("is registered as ContactForm in the show category", () => {
    expect(podcastBlocks.ContactForm).toBe(contactFormBlock);
    expect(podcastCategories.show.components).toContain("ContactForm");
  });
});
