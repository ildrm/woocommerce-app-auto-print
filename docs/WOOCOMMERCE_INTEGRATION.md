# WooCommerce integration

Create WooCommerce REST API **read-only** credentials for order retrieval. Enter the final HTTPS store root URL, consumer key and secret in Stores. Connection testing makes a bounded orders request before saving credentials to the OS vault. Redirects are disabled to prevent credential forwarding. Credentials never appear in query strings.

Orders are requested from `/wp-json/wc/v3/orders` with `per_page=100`, ascending modified ordering, UTC date interpretation, `modified_after` and `modified_before`. All pages must succeed before reconciliation commits. Missing pagination headers, invalid data, timeouts and oversized responses retain the previous watermark. Responses are bounded to 16 MB/page and 1000 pages.

The engine polls at each store's 10–3600 second interval, with a 120-second overlap and ten-second safety lag. A newly connected store starts near the current time, avoiding unsolicited historical printing. Configuration changes do not intentionally rescan the whole store. Paid-order routing requires a nonempty WooCommerce payment date unless a rule explicitly allows unpaid orders.

The mock-server test verifies pagination/auth headers and a monetary string beyond IEEE-754 exact integer range. Live-store authentication, unusual caching/proxy behavior, custom status restrictions and high-write pagination races need further verification. Store timezone is stored but advanced display-calendar formatting is incomplete.

Authoritative API reference: [WooCommerce Orders v3](https://developer.woocommerce.com/docs/apis/rest-api/v3/orders/). Webhook creation needs broader permissions; this application does not silently request or manage them.
