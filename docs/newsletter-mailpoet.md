# Newsletter signup: Next.js to MailPoet contract

The newsletter is assumed to be **MailPoet on the WordPress site** (the host in
`WP_BASE_URL`; `example.com` below). MailPoet has no public "subscribe" HTTP endpoint that
this site can call safely, so signup goes through a small endpoint that the
WordPress side provides. **That endpoint now exists in the WordPress repo** (see
"WordPress side" below). Until it is deployed and the env vars below are set, `POST /api/newsletter` answers `501` and the
form tells the visitor signup isn't available. It never reports a fake success.

```
Browser ──POST /api/newsletter──▶ Next.js route ──POST NEWSLETTER_ENDPOINT──▶ WordPress mu-plugin ──▶ MailPoet
        {email, firstName?, website?}   validate, honeypot,        Bearer NEWSLETTER_SECRET       addSubscriber()
                                        rate-limit, timeout 8s     {email, first_name?}
```

## Environment (Next.js side)

| Var | Purpose |
|---|---|
| `NEWSLETTER_ENDPOINT` | Full URL of the WordPress route, e.g. `https://example.com/wp-json/community-code/v1/newsletter` |
| `NEWSLETTER_SECRET` | Shared secret, sent as `Authorization: Bearer <secret>`. Server-only: never `NEXT_PUBLIC_`. |

If either is missing the route returns 501. Generate the secret once
(`openssl rand -base64 32`) and store it in both places: Pantheon Secrets
(or the Next.js site env) and the WordPress side (a Pantheon secret read with
`pantheon_get_secret()`, or a `wp-config.php` constant that is not committed).

## Contract

### Browser to Next.js: `POST /api/newsletter`

Request: `Content-Type: application/json`, body at most 2 KB.

```json
{ "email": "ada@example.com", "firstName": "Ada", "website": "" }
```

- `email`: required, string, at most 254 chars, loosely validated.
- `firstName`: optional, string, at most 80 chars.
- `website`: **honeypot**. The form renders it off-screen and out of the tab and
  accessibility trees. If it is non-empty the route returns `200 {"ok":true}`
  and does nothing, so bots get no signal.

| Status | Body | Meaning |
|---|---|---|
| 200 | `{"ok":true}` | Forwarded and accepted (includes "already subscribed", see below) |
| 400 | `{"error":"..."}` | Invalid JSON, email or name; or upstream rejected the address |
| 413 | `{"error":"..."}` | Body over 2 KB |
| 415 | `{"error":"..."}` | Not `application/json` |
| 429 | `{"error":"..."}` + `Retry-After` | Per-IP limit (5 per minute) or upstream 429 |
| 501 | `{"error":"Newsletter signup isn't configured yet."}` | `NEWSLETTER_ENDPOINT` / `NEWSLETTER_SECRET` unset |
| 502 / 504 | `{"error":"..."}` | Upstream error, unreachable, or slower than 8 s |

Error bodies are fixed strings. They never contain the upstream URL, upstream
response text, the secret, or the submitted email. The route logs upstream
status codes only.

**Rate limit:** in memory, per container, best-effort (5 requests per IP per
minute, keyed on the first `X-Forwarded-For` hop). Each instance counts
separately and a restart resets it, so it blunts naive scripts and nothing
more. The WordPress endpoint must rate-limit independently.

### Next.js to WordPress: `POST NEWSLETTER_ENDPOINT`

```
Authorization: Bearer <NEWSLETTER_SECRET>
Content-Type: application/json

{ "email": "ada@example.com", "first_name": "Ada" }
```

`first_name` is omitted when not collected. Expected responses:

| Status | Meaning |
|---|---|
| 200 / 201 | Subscribed, **or already subscribed**. Both must be 2xx so the form can't be used to discover who is on the list. |
| 400 / 422 | Address rejected. Next.js shows "That email address wasn't accepted." |
| 401 / 403 | Bad or missing secret. Shown to visitors as a generic failure (502); logged. |
| 429 | Rate limited |
| 5xx | Shown as a generic failure (502) |

Next.js follows no redirects (`redirect: "error"`) and never forwards the
upstream body to the browser.

**Bot protection:** if the WordPress host sits behind Pantheon's next-gen GCDN bot
protection, it can challenge a server-to-server POST with a `403`. When
`NEWSLETTER_ENDPOINT`'s host equals the host of `WP_BASE_URL`, the route also
sends `x-pantheon-bot-bypass` from `PANTHEON_BOT_BYPASS_TOKEN` (as the episode
and post fetches do). It is never sent to any other host. Whether the challenge
applies to this path is unverified; if it still blocks, add a WAF rule for
`POST /wp-json/community-code/v1/newsletter`.

## WordPress side

Implemented in the Community + Code WordPress repo as the `cc-p1-forms` mu-plugin,
route `POST /wp-json/community-code/v1/newsletter`, with its own secret. Its
contract, the Pantheon secret names and the MailPoet behaviour (double opt-in,
what happens for already-subscribed, unconfirmed and unsubscribed addresses) are
documented there, in `docs/p1-forms-endpoints.md`. It was written from MailPoet
5.38.0's source, not from a live signup: do one real signup before relying on it.

For this site set:

```
NEWSLETTER_ENDPOINT=https://<wordpress host>/wp-json/community-code/v1/newsletter
NEWSLETTER_SECRET=<the value stored as the cc_p1_newsletter_secret Pantheon secret>
```
