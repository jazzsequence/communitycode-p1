import type { Decorator } from "@storybook/nextjs-vite";

/**
 * Route table for the stories' fake `/api/*`. Keys are matched against the request
 * pathname (exact, or a `RegExp`); values are a JSON body, or a function from the
 * request URL to `{ status?, body, delayMs? }` for errors and slow responses.
 *
 * Blocks `fetch()` on mount, in an effect that runs before any parent effect, so the
 * stub is installed synchronously while the decorator renders, not in an effect.
 */
export type MockReply = { status?: number; body?: unknown; delayMs?: number };
export type MockRoutes = [string | RegExp, unknown | ((url: URL, init?: RequestInit) => MockReply)][];

const realFetch = typeof window !== "undefined" ? window.fetch.bind(window) : undefined;

export function installMockFetch(routes: MockRoutes) {
  if (!realFetch) return;
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.origin);
    const hit = routes.find(([k]) => (typeof k === "string" ? k === url.pathname : k.test(url.pathname)));
    if (!hit) return realFetch(input, init); // static assets, HMR, fonts
    const v = hit[1];
    const reply: MockReply = typeof v === "function" ? (v as (u: URL, i?: RequestInit) => MockReply)(url, init) : { body: v };
    if (reply.delayMs) {
      await new Promise((r, rej) => {
        const t = setTimeout(r, reply.delayMs);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(t);
          rej(new DOMException("Aborted", "AbortError"));
        });
      });
    }
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

/** Story decorator: `decorators: [withMockApi([["/api/episodes", episodeList]])]`. */
export const withMockApi =
  (routes: MockRoutes): Decorator =>
  (Story) => {
    installMockFetch(routes);
    return <Story />;
  };
