import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/newsletter/route";
import { checkRateLimit, resetRateLimit } from "@/app/api/newsletter/rate-limit";

// WordPress config comes from getConfig(); control it per test.
const wp = vi.hoisted(() => ({ value: null as null | { baseUrl: string; feedPath: string; bypassToken?: string } }));
vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config")>()),
  getConfig: () => ({ wordpress: wp.value, showfm: null, transcriptHosts: [] }),
}));

const ENDPOINT = "https://example.com/wp-json/cc/v1/subscribe";
const SECRET = "shh-newsletter-secret";
const EMAIL = "ada.lovelace@example.com";

let ipCounter = 0;
function send(body: unknown, init: { headers?: Record<string, string>; raw?: string | ReadableStream } = {}) {
  const headers = {
    "content-type": "application/json",
    "x-forwarded-for": `10.0.0.${++ipCounter}`,
    ...init.headers,
  };
  return POST(
    new NextRequest("http://localhost/api/newsletter", {
      method: "POST",
      headers,
      body: init.raw ?? JSON.stringify(body),
      duplex: "half",
    }),
  );
}

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetRateLimit();
  wp.value = { baseUrl: "https://example.com", feedPath: "/feed/" };
  process.env.NEWSLETTER_ENDPOINT = ENDPOINT;
  process.env.NEWSLETTER_SECRET = SECRET;
  fetchMock = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.NEWSLETTER_ENDPOINT;
  delete process.env.NEWSLETTER_SECRET;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const logged = () => JSON.stringify(errorSpy.mock.calls);

describe("POST /api/newsletter: happy path", () => {
  it("forwards to the endpoint with the bearer secret and a timeout", async () => {
    const res = await send({ email: `  ${EMAIL} `, firstName: " Ada " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe(ENDPOINT);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);
    expect(JSON.parse(init.body as string)).toEqual({ email: EMAIL, first_name: "Ada" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.redirect).toBe("error");
  });

  it("omits first_name when none is given", async () => {
    await send({ email: EMAIL });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ email: EMAIL });
  });

  it("sends the bot-bypass token only to the WordPress host", async () => {
    wp.value = { baseUrl: "https://example.com", feedPath: "/feed/", bypassToken: "bypass-tok" };
    await send({ email: EMAIL });
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      "x-pantheon-bot-bypass": "bypass-tok",
    });

    process.env.NEWSLETTER_ENDPOINT = "https://other.example.org/subscribe";
    await send({ email: EMAIL });
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).not.toHaveProperty("x-pantheon-bot-bypass");
  });

  it("works with WordPress unconfigured (no bypass header, still forwards)", async () => {
    wp.value = null;
    expect((await send({ email: EMAIL })).status).toBe(200);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("x-pantheon-bot-bypass");
  });
});

describe("validation", () => {
  it.each(["", "nope", "a@b", "a b@example.com", "@example.com", "a@.com", "a@example..com", "a@@example.com"])(
    "rejects email %j",
    async (email) => {
      const res = await send({ email });
      expect(res.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects an email over 254 chars", async () => {
    const long = `${"a".repeat(250)}@example.com`;
    expect((await send({ email: long })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-string email, missing email, and bad firstName", async () => {
    expect((await send({ email: 5 })).status).toBe(400);
    expect((await send({})).status).toBe(400);
    expect((await send({ email: EMAIL, firstName: "x".repeat(81) })).status).toBe(400);
    expect((await send({ email: EMAIL, firstName: { a: 1 } })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a firstName of exactly 80 chars", async () => {
    expect((await send({ email: EMAIL, firstName: "x".repeat(80) })).status).toBe(200);
  });

  it("415s a non-JSON content type and 400s malformed or non-object JSON", async () => {
    expect((await send({ email: EMAIL }, { headers: { "content-type": "text/plain" } })).status).toBe(415);
    expect((await send(null, { raw: "{not json" })).status).toBe(400);
    expect((await send(null, { raw: "[1,2]" })).status).toBe(400);
    expect((await send(null, { raw: "null" })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("413s an oversized body, by declared length and by streamed size", async () => {
    const big = JSON.stringify({ email: EMAIL, firstName: "x".repeat(5000) });
    const declared = await send(null, { raw: big, headers: { "content-length": String(big.length) } });
    expect(declared.status).toBe(413);

    // No content-length: the route must cut the stream off itself.
    const chunk = new TextEncoder().encode("x".repeat(1500));
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(chunk);
        c.enqueue(chunk);
        c.close();
      },
    });
    const streamed = await send(null, { raw: stream });
    expect(streamed.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("honeypot", () => {
  it("answers 200 and does nothing", async () => {
    const res = await send({ email: EMAIL, website: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does so even for an invalid email, and when unconfigured, so bots learn nothing", async () => {
    delete process.env.NEWSLETTER_ENDPOINT;
    const res = await send({ email: "junk", website: "x" });
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an empty honeypot is a normal signup", async () => {
    await send({ email: EMAIL, website: "" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("rate limit", () => {
  const sameIp = { headers: { "x-forwarded-for": "203.0.113.9" } };

  it("allows 5 per minute per IP, then 429 with Retry-After", async () => {
    for (let i = 0; i < 5; i++) expect((await send({ email: EMAIL }, sameIp)).status).toBe(200);
    const res = await send({ email: EMAIL }, sameIp);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    // Another client is unaffected.
    expect((await send({ email: EMAIL }, { headers: { "x-forwarded-for": "203.0.113.10" } })).status).toBe(200);
  });

  it("counts rejected and honeypot requests too", async () => {
    for (let i = 0; i < 5; i++) await send({ email: "bad" }, sameIp);
    expect((await send({ email: EMAIL }, sameIp)).status).toBe(429);
  });

  it("the window slides", () => {
    for (let i = 0; i < 5; i++) expect(checkRateLimit("k", 1_000).allowed).toBe(true);
    expect(checkRateLimit("k", 30_000).allowed).toBe(false);
    expect(checkRateLimit("k", 61_001).allowed).toBe(true);
  });
});

describe("unconfigured: never a fake success", () => {
  it("501s with the documented message when NEWSLETTER_ENDPOINT is unset", async () => {
    delete process.env.NEWSLETTER_ENDPOINT;
    const res = await send({ email: EMAIL });
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "Newsletter signup isn't configured yet." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("501s when the secret is missing, or the endpoint is not a URL", async () => {
    delete process.env.NEWSLETTER_SECRET;
    expect((await send({ email: EMAIL })).status).toBe(501);
    process.env.NEWSLETTER_SECRET = SECRET;
    process.env.NEWSLETTER_ENDPOINT = "not a url";
    expect((await send({ email: EMAIL })).status).toBe(501);
    process.env.NEWSLETTER_ENDPOINT = "javascript:alert(1)";
    expect((await send({ email: EMAIL })).status).toBe(501);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("upstream failures", () => {
  const cases: [string, () => Promise<Response>, number][] = [
    ["a 500", async () => new Response(`boom ${EMAIL} ${SECRET} ${ENDPOINT}`, { status: 500 }), 502],
    ["a 401 (bad secret)", async () => new Response("", { status: 401 }), 502],
    ["a 403 bot challenge", async () => new Response("", { status: 403 }), 502],
    ["a 422", async () => new Response("bad", { status: 422 }), 400],
    ["a 400", async () => new Response("bad", { status: 400 }), 400],
    ["a 429", async () => new Response("", { status: 429 }), 429],
    [
      "a network error",
      async () => {
        throw new TypeError(`fetch failed ${ENDPOINT} ${SECRET} ${EMAIL}`);
      },
      502,
    ],
    [
      "a timeout",
      async () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      },
      504,
    ],
  ];

  it.each(cases)("maps %s to a safe %i-class response", async (_name, impl, status) => {
    fetchMock.mockImplementationOnce(impl);
    const res = await send({ email: EMAIL, firstName: "Ada" });
    expect(res.status).toBe(status);
    const text = JSON.stringify(await res.json());
    expect(text).toMatch(/"error"/);
    for (const leak of [EMAIL, SECRET, "example.com", "wp-json", "boom", "TypeError"]) {
      expect(text).not.toContain(leak);
    }
    // And nothing sensitive in logs.
    for (const leak of [EMAIL, SECRET, "Ada", "wp-json"]) expect(logged()).not.toContain(leak);
  });
});
