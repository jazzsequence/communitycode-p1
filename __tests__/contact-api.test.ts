import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/contact/route";
import { resetRateLimit } from "@/lib/forms/rate-limit";

// WordPress config comes from getConfig(); control it per test.
const wp = vi.hoisted(() => ({ value: null as null | { baseUrl: string; feedPath: string; userAgent?: string; bypassToken?: string } }));
vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config")>()),
  getConfig: () => ({ wordpress: wp.value, showfm: null, transcriptHosts: [] }),
}));

const ENDPOINT = "https://example.com/wp-json/cc/v1/contact";
const SECRET = "shh-contact-secret";
const NAME = "Ada Lovelace";
const EMAIL = "ada.lovelace@example.com";
const MESSAGE = "Hello there, I'd love to be a guest.";
const VALID = { name: NAME, email: EMAIL, message: MESSAGE };

let ipCounter = 0;
function send(body: unknown, init: { headers?: Record<string, string>; raw?: string | ReadableStream } = {}) {
  const headers = {
    "content-type": "application/json",
    "x-forwarded-for": `10.1.0.${++ipCounter}`,
    ...init.headers,
  };
  return POST(
    new NextRequest("http://localhost/api/contact", {
      method: "POST",
      headers,
      body: init.raw ?? JSON.stringify(body),
      duplex: "half",
    }),
  );
}

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetRateLimit();
  wp.value = { baseUrl: "https://example.com", feedPath: "/feed/" };
  process.env.CONTACT_ENDPOINT = ENDPOINT;
  process.env.CONTACT_SECRET = SECRET;
  fetchMock = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.CONTACT_ENDPOINT;
  delete process.env.CONTACT_SECRET;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const logged = () => JSON.stringify([...errorSpy.mock.calls, ...logSpy.mock.calls]);
const sentHeaders = (i = 0) => (fetchMock.mock.calls[i][1] as RequestInit).headers as Record<string, string>;

describe("POST /api/contact: happy path", () => {
  it("forwards exactly { name, email, message } with the bearer secret and a timeout", async () => {
    const res = await send({ name: `  ${NAME} `, email: `  ${EMAIL} `, message: `\n ${MESSAGE}  `, website: "" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe(ENDPOINT);
    expect(init.method).toBe("POST");
    expect(sentHeaders()).toMatchObject({
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${SECRET}`,
    });
    // Exactly the contract body: no honeypot field, nothing extra.
    expect(JSON.parse(init.body as string)).toEqual({ name: NAME, email: EMAIL, message: MESSAGE });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");
  });

  it("collapses line breaks in the name (it may end up in a mail header)", async () => {
    await send({ ...VALID, name: "Ada\r\nBcc: evil@example.org" });
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).name).toBe("Ada Bcc: evil@example.org");
  });

  it("keeps line breaks in the message", async () => {
    await send({ ...VALID, message: "line one\n\nline two" });
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).message).toBe("line one\n\nline two");
  });

  it("sends the bot-bypass token only to the WordPress host", async () => {
    wp.value = { baseUrl: "https://example.com", feedPath: "/feed/", bypassToken: "bypass-tok" };
    await send(VALID);
    expect(sentHeaders(0)).toMatchObject({ "x-pantheon-bot-bypass": "bypass-tok" });

    process.env.CONTACT_ENDPOINT = "https://other.example.org/contact";
    await send(VALID);
    expect(sentHeaders(1)).not.toHaveProperty("x-pantheon-bot-bypass");
  });

  it("sends the allowlisted User-Agent, with no token, only to the WordPress host", async () => {
    wp.value = { baseUrl: "https://example.com", feedPath: "/feed/", userAgent: "site-ua/1.0" };
    await send(VALID);
    expect(sentHeaders(0)["User-Agent"]).toBe("site-ua/1.0");
    expect(sentHeaders(0)).not.toHaveProperty("x-pantheon-bot-bypass");

    process.env.CONTACT_ENDPOINT = "https://other.example.org/contact";
    await send(VALID);
    expect(sentHeaders(1)).not.toHaveProperty("User-Agent");
  });

  it("falls back to the default User-Agent when the site sets none", async () => {
    await send(VALID);
    expect(sentHeaders(0)["User-Agent"]).toBeTruthy();
  });

  it("works with WordPress unconfigured (no bypass headers, still forwards)", async () => {
    wp.value = null;
    expect((await send(VALID)).status).toBe(200);
    expect(sentHeaders()).not.toHaveProperty("x-pantheon-bot-bypass");
    expect(sentHeaders()).not.toHaveProperty("User-Agent");
  });
});

describe("validation", () => {
  it.each([
    ["missing name", { email: EMAIL, message: MESSAGE }],
    ["blank name", { ...VALID, name: "   " }],
    ["non-string name", { ...VALID, name: 5 }],
    ["name over 100", { ...VALID, name: "x".repeat(101) }],
    ["missing email", { name: NAME, message: MESSAGE }],
    ["non-string email", { ...VALID, email: {} }],
    ["email over 254", { ...VALID, email: `${"a".repeat(250)}@example.com` }],
    ["missing message", { name: NAME, email: EMAIL }],
    ["blank message", { ...VALID, message: " \n " }],
    ["non-string message", { ...VALID, message: ["x"] }],
    ["message over 5000", { ...VALID, message: "x".repeat(5001) }],
  ])("400s %s with a human message", async (_n, body) => {
    const res = await send(body);
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["", "nope", "a@b", "a b@example.com", "@example.com", "a@.com", "a@example..com", "a@@example.com"])(
    "rejects email %j",
    async (email) => {
      expect((await send({ ...VALID, email })).status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("accepts the boundaries: name 100, message 5000", async () => {
    expect((await send({ ...VALID, name: "x".repeat(100), message: "y".repeat(5000) })).status).toBe(200);
  });

  it("415s a non-JSON content type and 400s malformed or non-object JSON", async () => {
    expect((await send(VALID, { headers: { "content-type": "text/plain" } })).status).toBe(415);
    expect((await send(null, { raw: "{not json" })).status).toBe(400);
    expect((await send(null, { raw: "[1,2]" })).status).toBe(400);
    expect((await send(null, { raw: "null" })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("413s an oversized body, by declared length and by streamed size", async () => {
    const big = JSON.stringify({ ...VALID, message: "x".repeat(20_000) });
    const declared = await send(null, { raw: big, headers: { "content-length": String(big.length) } });
    expect(declared.status).toBe(413);

    // No content-length: the route must cut the stream off itself.
    const chunk = new TextEncoder().encode("x".repeat(9_000));
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(chunk);
        c.enqueue(chunk);
        c.close();
      },
    });
    expect((await send(null, { raw: stream })).status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("honeypot", () => {
  it("answers 200 {ok:true} and sends nothing", async () => {
    const res = await send({ ...VALID, website: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does so even for an invalid body, and when unconfigured, so bots learn nothing", async () => {
    delete process.env.CONTACT_ENDPOINT;
    const res = await send({ name: "", email: "junk", message: "", website: "x" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an empty honeypot is a normal submission", async () => {
    await send({ ...VALID, website: "" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("rate limit", () => {
  const sameIp = { headers: { "x-forwarded-for": "203.0.113.9" } };

  it("allows 5 per minute per IP, then 429 with Retry-After", async () => {
    for (let i = 0; i < 5; i++) expect((await send(VALID, sameIp)).status).toBe(200);
    const res = await send(VALID, sameIp);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect((await send(VALID, { headers: { "x-forwarded-for": "203.0.113.10" } })).status).toBe(200);
  });
});

describe("unconfigured: never a fake success", () => {
  it("501s with the documented message when CONTACT_ENDPOINT is unset", async () => {
    delete process.env.CONTACT_ENDPOINT;
    const res = await send(VALID);
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "Contact form isn't configured yet." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("501s when the secret is missing, or the endpoint is not an http(s) URL", async () => {
    delete process.env.CONTACT_SECRET;
    expect((await send(VALID)).status).toBe(501);
    process.env.CONTACT_SECRET = SECRET;
    for (const bad of ["not a url", "javascript:alert(1)", "ftp://example.com/x"]) {
      process.env.CONTACT_ENDPOINT = bad;
      expect((await send(VALID)).status).toBe(501);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not share its rate-limit allowance with the newsletter", async () => {
    const { POST: newsletter } = await import("@/app/api/newsletter/route");
    const headers = { "content-type": "application/json", "x-forwarded-for": "198.51.100.7" };
    for (let i = 0; i < 5; i++) {
      await newsletter(new NextRequest("http://localhost/api/newsletter", { method: "POST", headers, body: "{}", duplex: "half" }));
    }
    expect((await send(VALID, { headers: { "x-forwarded-for": "198.51.100.7" } })).status).toBe(200);
  });
});

describe("upstream failures", () => {
  const leaks = [NAME, EMAIL, MESSAGE, SECRET, "example.com", "wp-json", "boom", "TypeError"];
  const cases: [string, () => Promise<Response>][] = [
    ["a 500", async () => new Response(`boom ${EMAIL} ${MESSAGE} ${SECRET} ${ENDPOINT}`, { status: 500 })],
    ["a 401 (bad secret)", async () => new Response("", { status: 401 })],
    ["a 403", async () => new Response("", { status: 403 })],
    ["a 400", async () => Response.json({ error: `bad ${EMAIL}` }, { status: 400 })],
    ["a 429", async () => new Response("", { status: 429 })],
    [
      "a 200 HTML page instead of the endpoint (an edge or CMS answering for it)",
      async () => new Response(`<!DOCTYPE html><html><body>${EMAIL} ${MESSAGE}</body></html>`, { status: 200, headers: { "content-type": "text/html; charset=UTF-8" } }),
    ],
    ["a 200 JSON body without ok:true", async () => Response.json({ sent: true })],
    ["a 200 JSON body with ok:false", async () => Response.json({ ok: false })],
    ["a 200 with an empty body", async () => new Response("", { status: 200 })],
    ["a 200 JSON content-type with a non-JSON body", async () => new Response("not json", { status: 200, headers: { "content-type": "application/json" } })],
    [
      "a network error",
      async () => {
        throw new TypeError(`fetch failed ${ENDPOINT} ${SECRET} ${EMAIL}`);
      },
    ],
    [
      "a timeout",
      async () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      },
    ],
  ];

  it.each(cases)("maps %s to a generic 502 with no leak", async (_name, impl) => {
    fetchMock.mockImplementationOnce(impl);
    const res = await send(VALID);
    expect(res.status).toBe(502);
    const text = JSON.stringify(await res.json());
    expect(text).toMatch(/"error"/);
    for (const leak of leaks) expect(text).not.toContain(leak);
    for (const leak of [...leaks, "Lovelace", "guest"]) expect(logged()).not.toContain(leak);
  });
});

describe("privacy: logging", () => {
  it("never logs the name, email or message, on success or failure", async () => {
    await send(VALID);
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    await send(VALID);
    fetchMock.mockRejectedValueOnce(new Error(`kaboom ${EMAIL}`));
    await send(VALID);
    process.env.CONTACT_ENDPOINT = "bad url";
    await send(VALID);
    for (const secret of [NAME, "Lovelace", EMAIL, MESSAGE, "guest", SECRET]) expect(logged()).not.toContain(secret);
  });
});
