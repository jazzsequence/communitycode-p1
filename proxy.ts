import { createP1Middleware } from "@pantheon-systems/p1-next-sdk/server";

// Next 16 renamed the `middleware` file convention to `proxy` (runs on Node, no edge runtime). The P1 SDK's
// factory keeps its own `createP1Middleware` name; only this file and its export follow Next's convention.
const p1Middleware = createP1Middleware({
  cssBaseUrl: process.env.NEXT_PUBLIC_CSS_BASE_URL,
  apiToken: process.env.CSS_API_KEY ?? "",
  siteId: process.env.NEXT_PUBLIC_CSS_SITE_ID ?? "",
});

export async function proxy(request: Request) {
  return p1Middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
