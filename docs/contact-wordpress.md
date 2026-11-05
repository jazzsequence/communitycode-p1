# Contact form: Next.js to WordPress contract

The `ContactForm` block posts to `POST /api/contact` on this site, which
validates and forwards server-side to a small endpoint **the WordPress side
provides** (`CONTACT_ENDPOINT`), which sends the message by mail. Same shape as
the newsletter (`docs/newsletter-mailpoet.md`). **The WordPress endpoint lives in the
WordPress repo** (`cc-p1-forms` mu-plugin; contract and secret names in its
`docs/p1-forms-endpoints.md`). Until it is deployed and both env vars below are set,
`POST /api/contact` answers `501` and the form tells the visitor it isn't
available. It never reports a fake success.

```
Browser ──POST /api/contact──▶ Next.js route ──POST CONTACT_ENDPOINT──▶ WordPress endpoint ──▶ wp_mail()
        {name,email,message,    validate, honeypot,   Bearer CONTACT_SECRET   {name,email,message}
         website?}              rate-limit, timeout 8s
```

## Environment (Next.js side, server-only, never `NEXT_PUBLIC_`)

| Var | Purpose |
|---|---|
| `CONTACT_ENDPOINT` | Full http(s) URL of the WordPress route, e.g. `https://example.com/wp-json/community-code/v1/contact` |
| `CONTACT_SECRET` | Shared secret, sent as `Authorization: Bearer <secret>` |

If either is missing, or the endpoint isn't an http(s) URL, the route returns
501. Store the same secret on the WordPress side as the Pantheon secret
`cc_p1_contact_secret` (read with `pantheon_get_secret()`).

## Browser to Next.js: `POST /api/contact`

`Content-Type: application/json`, body at most 16 KB (5000 characters can be
15 KB as UTF-8).

```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "message": "Hello!", "website": "" }
```

| Field | Rule |
|---|---|
| `name` | required string, trimmed, 1-100 chars. Whitespace runs (including line breaks) collapse to one space, so it is safe in a mail header. |
| `email` | required string, trimmed, at most 254 chars, loose check (`x@y.z`); WordPress is the real check |
| `message` | required string, trimmed, 1-5000 chars. Line breaks are kept. |
| `website` | **honeypot**, optional. Non-empty => `200 {"ok":true}`, nothing is sent (checked before validation, so bots learn nothing). |

| Status | Body | Meaning |
|---|---|---|
| 200 | `{"ok":true}` | Forwarded and accepted (or honeypot) |
| 400 | `{"error":"..."}` | Invalid JSON or field; message is human-readable |
| 413 | `{"error":"..."}` | Body over 16 KB |
| 415 | `{"error":"..."}` | Not `application/json` |
| 429 | `{"error":"..."}` + `Retry-After` | Per-IP limit: 5 per minute, best-effort (in memory, per container, own counter separate from the newsletter's) |
| 501 | `{"error":"Contact form isn't configured yet."}` | `CONTACT_ENDPOINT` / `CONTACT_SECRET` unset or invalid |
| 502 | `{"error":"..."}` | Any upstream failure: 4xx, 5xx, unreachable, or slower than 8 s |

Error bodies are fixed strings. They never contain the upstream URL, upstream
response, the secret, or anything the visitor submitted. **Name, email and
message are never logged**; the route logs upstream status codes only.

## Next.js to WordPress: `POST CONTACT_ENDPOINT`

```
Authorization: Bearer <CONTACT_SECRET>
Content-Type: application/json
Accept: application/json

{ "name": "Ada Lovelace", "email": "ada@example.com", "message": "Hello!" }
```

Exactly those three string fields, already trimmed and length-checked. No
honeypot field. Next.js does not follow redirects (`redirect: "error"`), sets
`cache: "no-store"` and aborts after 8 seconds.

Expected replies:

| Status | Body | Next.js does |
|---|---|---|
| 200 | `{"ok":true}` | Replies `200 {"ok":true}` as JSON. Next.js counts a 2xx as sent **only** with that body: an HTML page or any other 2xx answers 502, so a CMS or edge serving a page where the route should be can't make a message look sent. |
| 400 | `{"error":"..."}` | Replies 502 generic (Next.js already validated, so this is a contract mismatch). Logs the status. |
| 401 / 403 | any | Bad secret or bot challenge: 502 generic, logged |
| 5xx | any | 502 generic, logged |

Any other non-2xx is also 502. The WordPress body is never forwarded to the
browser.

**Bot protection:** if the WordPress host sits behind Pantheon's next-gen GCDN
bot protection it can challenge a server-to-server POST with a `403`. When
`CONTACT_ENDPOINT`'s host equals the host of `WP_BASE_URL`, the route also sends
the allowlisted `User-Agent` (`WP_USER_AGENT`, default `communitycode-p1/1.0`)
and, if set, `x-pantheon-bot-bypass` from `PANTHEON_BOT_BYPASS_TOKEN`, exactly as
the newsletter route does. Neither is sent to any other host. If the challenge
still blocks this path, add a WAF rule for `POST` on the route.

## What the WordPress side should do

- Verify the bearer in constant time (`hash_equals`); 401/403 otherwise; 503 if
  the secret isn't configured on its side.
- Validate again (`is_email`, lengths), `sanitize_text_field` the name,
  `sanitize_textarea_field` the message. Treat everything as untrusted.
- Rate-limit independently (the Next.js limiter is per container and
  best-effort). The caller is always the Next.js server, so key on the sender
  address or a global window, not the IP.
- Send with `wp_mail()` to the site's contact address. Put the visitor's address
  in `Reply-To` (not `From`, which must stay on the site's domain for SPF/DKIM),
  and never build a header from unsanitised input.
- Reply `200 {"ok":true}` on success; do not store or log the message body
  beyond what the mail needs.

## Verification status

The Next.js side is covered by unit tests with a mocked `fetch`. **Nothing has
been run against a real WordPress endpoint, and the block has not been viewed in
a browser.**
