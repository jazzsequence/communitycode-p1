// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewsletterSignupView, newsletterSignupBlock } from "@/components/puck/podcast/newsletter-signup";

const props = { ...newsletterSignupBlock.defaultProps, collectFirstName: true };

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

const emailInput = () => screen.getByLabelText("Email address") as HTMLInputElement;
const submitBtn = () => screen.getByRole("button", { name: /subscribe|subscribing/i }) as HTMLButtonElement;
const alertRegion = () => screen.getAllByRole("alert")[0];

describe("NewsletterSignup form", () => {
  it("renders labelled fields, heading and description", () => {
    render(<NewsletterSignupView {...props} />);
    expect(screen.getByRole("heading", { level: 2, name: props.heading })).toBeTruthy();
    expect(screen.getByText(props.description)).toBeTruthy();
    expect(emailInput().type).toBe("email");
    expect(emailInput().getAttribute("autocomplete")).toBe("email");
    expect(emailInput().getAttribute("aria-required")).toBe("true");
    expect(screen.getByLabelText(/First name/)).toBeTruthy();
    // The privacy note describes the email field.
    const hintId = emailInput().getAttribute("aria-describedby")!;
    expect(document.getElementById(hintId)?.textContent).toBe(props.privacyNote);
  });

  it("hides the first-name field unless enabled", () => {
    render(<NewsletterSignupView {...props} collectFirstName={false} />);
    expect(screen.queryByLabelText(/First name/)).toBeNull();
  });

  it("submits, shows the success message in a live region, and sends the payload", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    render(<NewsletterSignupView {...props} successMessage="You're in!" />);

    await userEvent.type(screen.getByLabelText(/First name/), "Ada");
    await userEvent.type(emailInput(), "ada@example.com");
    await userEvent.click(submitBtn());

    const msg = await screen.findByText("You're in!");
    expect(msg.closest("[role='status']")?.getAttribute("aria-live")).toBe("polite");
    expect(screen.queryByLabelText("Email address")).toBeNull();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/newsletter");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ email: "ada@example.com", firstName: "Ada", website: "" });
    // Focus lands on the message so keyboard users aren't dropped on <body>.
    await waitFor(() => expect(document.activeElement).toBe(msg.closest("[role='status']")));
  });

  it("shows and announces a validation error, focuses the email, and doesn't call the API", async () => {
    render(<NewsletterSignupView {...props} />);
    await userEvent.type(emailInput(), "not-an-email");
    await userEvent.click(submitBtn());

    const alert = alertRegion();
    expect(alert.textContent).toMatch(/valid email address/i);
    expect(alert.getAttribute("role")).toBe("alert");
    expect(emailInput().getAttribute("aria-invalid")).toBe("true");
    expect(emailInput().getAttribute("aria-describedby")).toContain(alert.id);
    expect(document.activeElement).toBe(emailInput());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(props.successMessage)).toBeNull();

    // Editing clears the invalid state.
    await userEvent.type(emailInput(), "x");
    expect(emailInput().getAttribute("aria-invalid")).toBeNull();
  });

  it("flags an empty email too", async () => {
    render(<NewsletterSignupView {...props} />);
    await userEvent.click(submitBtn());
    expect(alertRegion().textContent).toMatch(/valid email/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says plainly that signup isn't available on a 501, and never shows success", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "Newsletter signup isn't configured yet." }, { status: 501 }),
    );
    render(<NewsletterSignupView {...props} />);
    await userEvent.type(emailInput(), "ada@example.com");
    await userEvent.click(submitBtn());

    await waitFor(() => expect(alertRegion().textContent).toMatch(/isn't available yet/i));
    expect(screen.queryByText(props.successMessage)).toBeNull();
    // The form is still usable and the address is kept.
    expect(emailInput().value).toBe("ada@example.com");
    expect(submitBtn().disabled).toBe(false);
  });

  it("shows the server's message on other failures, and a generic one when the body is unreadable", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Too many attempts." }, { status: 429 }));
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 502 }));
    render(<NewsletterSignupView {...props} />);
    await userEvent.type(emailInput(), "ada@example.com");

    await userEvent.click(submitBtn());
    await waitFor(() => expect(alertRegion().textContent).toBe("Too many attempts."));
    await userEvent.click(submitBtn());
    await waitFor(() => expect(alertRegion().textContent).toMatch(/couldn't sign you up/i));
  });

  it("reports a network failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<NewsletterSignupView {...props} />);
    await userEvent.type(emailInput(), "ada@example.com");
    await userEvent.click(submitBtn());
    await waitFor(() => expect(alertRegion().textContent).toMatch(/couldn't reach the server/i));
    expect(screen.queryByText(props.successMessage)).toBeNull();
  });

  it("disables the button and marks it busy while submitting; can't double submit", async () => {
    const d = deferred<Response>();
    fetchMock.mockReturnValueOnce(d.promise);
    render(<NewsletterSignupView {...props} />);
    await userEvent.type(emailInput(), "ada@example.com");

    await userEvent.click(submitBtn());
    expect(submitBtn().disabled).toBe(true);
    expect(submitBtn().getAttribute("aria-busy")).toBe("true");
    expect(submitBtn().textContent).toBe("Subscribing…");

    // Enter in the field submits the form too; neither path may send again.
    await userEvent.click(submitBtn());
    await userEvent.type(emailInput(), "{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    d.resolve(Response.json({ ok: true }));
    await screen.findByText(props.successMessage);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the honeypot out of sight, the tab order and the accessibility tree", async () => {
    render(<NewsletterSignupView {...props} />);
    const honeypot = document.querySelector<HTMLInputElement>("input[name='website']")!;
    expect(honeypot.getAttribute("tabindex")).toBe("-1");
    expect(honeypot.getAttribute("autocomplete")).toBe("off");
    expect(honeypot.closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.queryAllByRole("textbox", { name: /empty/i })).toHaveLength(0);

    // Tabbing through the form never lands on it.
    const visited: Element[] = [];
    await userEvent.tab();
    for (let i = 0; i < 6; i++) {
      visited.push(document.activeElement!);
      await userEvent.tab();
    }
    expect(visited).not.toContain(honeypot);
    expect(visited).toContain(emailInput());
  });

  it("passes a filled honeypot to the server (which drops it)", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    render(<NewsletterSignupView {...props} />);
    const honeypot = document.querySelector<HTMLInputElement>("input[name='website']")!;
    await userEvent.type(emailInput(), "ada@example.com");
    // A bot fills every input, including ones a human can't reach.
    fireEvent.change(honeypot, { target: { value: "http://spam.example" } });
    await userEvent.click(submitBtn());
    await screen.findByText(props.successMessage);
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).website).toBe("http://spam.example");
  });
});

describe("NewsletterSignup endpoint field", () => {
  async function submitTo(endpoint: string) {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    render(<NewsletterSignupView {...props} endpoint={endpoint} />);
    await userEvent.type(emailInput(), "ada@example.com");
    await userEvent.click(submitBtn());
    await screen.findByText(props.successMessage);
    return fetchMock.mock.calls[0][0] as string;
  }

  it("posts to the custom endpoint", async () => {
    expect(await submitTo("https://api.example.org/subscribe?list=7")).toBe(
      "https://api.example.org/subscribe?list=7",
    );
  });

  it.each(["javascript:alert(1)", "//evil.example/x", ""])("falls back to the default for %j", async (endpoint) => {
    expect(await submitTo(endpoint)).toBe("/api/newsletter");
  });

  it("has an endpoint field defaulting to the shared default", () => {
    expect(newsletterSignupBlock.fields.endpoint.type).toBe("text");
    expect(newsletterSignupBlock.defaultProps.endpoint).toBe("/api/newsletter");
  });
});

describe("newsletterSignupBlock config", () => {
  it("declares the editor fields", () => {
    expect(Object.keys(newsletterSignupBlock.fields)).toEqual([
      "heading",
      "endpoint",
      "description",
      "buttonLabel",
      "successMessage",
      "collectFirstName",
      "privacyNote",
    ]);
    expect(newsletterSignupBlock.defaultProps.collectFirstName).toBe(false);
  });
});
