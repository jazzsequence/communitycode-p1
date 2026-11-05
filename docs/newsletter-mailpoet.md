# Newsletter signup: Next.js to MailPoet contract

The newsletter is assumed to be **MailPoet on the WordPress site** (the host in
`WP_BASE_URL`; `example.com` below). MailPoet has no public "subscribe" HTTP endpoint that
this site can call safely, so signup goes through a small endpoint that the
WordPress side provides. **That endpoint is not built yet.** Until it exists
and the env vars below are set, `POST /api/newsletter` answers `501` and the
form tells the visitor signup isn't available. It never reports a fake success.

```
Browser ──POST /api/newsletter──▶ Next.js route ──POST NEWSLETTER_ENDPOINT──▶ WordPress mu-plugin ──▶ MailPoet
        {email, firstName?, website?}   validate, honeypot,        Bearer NEWSLETTER_SECRET       addSubscriber()
                                        rate-limit, timeout 8s     {email, first_name?}
```

## Environment (Next.js side)

| Var | Purpose |
|---|---|
| `NEWSLETTER_ENDPOINT` | Full URL of the WordPress route, e.g. `https://example.com/wp-json/cc/v1/subscribe` |
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
`POST /wp-json/cc/v1/subscribe`.

## WordPress side: mu-plugin sketch

> **Design sketch. Untested.** Written against MailPoet's documented PHP API
> (`\MailPoet\API\API::MP('v1')`) but never run. It belongs in the WordPress
> repo (`wp-content/mu-plugins/cc-newsletter.php`), not here. Verify the
> MailPoet version's exception codes and list ids before relying on it.

```php
<?php
/**
 * Plugin Name: CC Newsletter Subscribe
 * Description: Shared-secret REST endpoint that adds a subscriber to MailPoet.
 *              DESIGN SKETCH, UNTESTED.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'cc/v1', '/subscribe', [
		'methods'             => 'POST',
		'callback'            => 'cc_newsletter_subscribe',
		'permission_callback' => 'cc_newsletter_authorized',
		'args'                => [
			'email'      => [
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_email',
				'validate_callback' => fn( $v ) => is_email( $v ) && strlen( $v ) <= 254,
			],
			'first_name' => [
				'required'          => false,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => fn( $v ) => strlen( $v ) <= 80,
			],
		],
	] );
} );

/**
 * The secret is the only credential, so compare in constant time. Define
 * CC_NEWSLETTER_SECRET outside version control (or read it from Pantheon Secrets).
 */
function cc_newsletter_authorized( WP_REST_Request $request ) {
	$secret = defined( 'CC_NEWSLETTER_SECRET' ) ? CC_NEWSLETTER_SECRET : '';
	if ( '' === $secret ) {
		return new WP_Error( 'cc_not_configured', 'Not configured.', [ 'status' => 503 ] );
	}
	$header = (string) $request->get_header( 'authorization' );
	$given  = 0 === stripos( $header, 'Bearer ' ) ? substr( $header, 7 ) : '';
	if ( ! hash_equals( $secret, $given ) ) {
		return new WP_Error( 'cc_forbidden', 'Forbidden.', [ 'status' => 403 ] );
	}
	return true;
}

function cc_newsletter_subscribe( WP_REST_Request $request ) {
	if ( ! class_exists( \MailPoet\API\API::class ) ) {
		return new WP_Error( 'cc_mailpoet_missing', 'Unavailable.', [ 'status' => 503 ] );
	}

	// Rate limit by address (the caller is always our server, so IP is useless).
	// 3 attempts per address per 10 minutes. A transient is crude but enough.
	$key   = 'cc_nl_' . md5( strtolower( $request['email'] ) );
	$count = (int) get_transient( $key );
	if ( $count >= 3 ) {
		return new WP_Error( 'cc_rate_limited', 'Too many attempts.', [ 'status' => 429 ] );
	}
	set_transient( $key, $count + 1, 10 * MINUTE_IN_SECONDS );

	$list_id    = (int) ( defined( 'CC_NEWSLETTER_LIST_ID' ) ? CC_NEWSLETTER_LIST_ID : 0 );
	$subscriber = [ 'email' => $request['email'] ];
	if ( ! empty( $request['first_name'] ) ) {
		$subscriber['first_name'] = $request['first_name'];
	}

	$mailpoet = \MailPoet\API\API::MP( 'v1' );
	try {
		try {
			// send_confirmation_email honours the list's double opt-in setting.
			$mailpoet->addSubscriber( $subscriber, [ $list_id ], [
				'send_confirmation_email'      => true,
				'schedule_welcome_email'       => false,
				'skip_subscriber_notification' => true,
			] );
		} catch ( \MailPoet\API\MP\v1\APIException $e ) {
			// Idempotent: the address exists (code 12 in MailPoet's API at the
			// time of writing; verify). Make sure it is on our list, then
			// answer exactly as for a new signup.
			if ( 12 !== $e->getCode() ) {
				throw $e;
			}
			$mailpoet->subscribeToLists( $request['email'], [ $list_id ], [
				'send_confirmation_email' => true,
			] );
		}
	} catch ( \Exception $e ) {
		// Log the code, never the address.
		error_log( 'cc-newsletter: MailPoet error ' . $e->getCode() );
		return new WP_Error( 'cc_subscribe_failed', 'Could not subscribe.', [ 'status' => 422 ] );
	}

	return new WP_REST_Response( [ 'ok' => true ], 200 );
}
```

Notes on the sketch:

- **Idempotency.** A new address and an existing one both return `200 {"ok":true}`.
  Do not reveal which. A subscriber who unsubscribed may need re-confirmation;
  `subscribeToLists` with `send_confirmation_email` covers that.
- **List id.** `CC_NEWSLETTER_LIST_ID` is the MailPoet list's numeric id
  (MailPoet, Lists, hover the list). Define it in `wp-config.php`.
- **Rate limiting.** The sketch limits per address. Add a limit on the route as
  a whole (a WAF rule, or a global transient counter) so one caller can't spray
  many addresses. The Next.js limiter is per container and not a substitute.
- **Errors.** Return a status and a generic message only. Next.js maps 400/422 to
  "address wasn't accepted" and everything else to a generic failure.
- **Never `permission_callback => '__return_true'`.** The endpoint must always be
  authenticated; it is the only thing standing between the internet and your list.
