# Optional event relay

`autoprint-relay` provides POST `/webhooks/{store}`, GET `/events`, and POST `/events/{id}/ack`. It verifies the WooCommerce base64 HMAC-SHA256 signature over the exact request bytes, accepts order.created/order.updated, requires delivery IDs, and durably deduplicates notifications. It stores order IDs, not the complete webhook order snapshot.

Set `AUTOPRINT_WEBHOOK_SECRET`, `AUTOPRINT_RELAY_TOKEN` (both at least 32 characters), `AUTOPRINT_STORE_ID`, and optionally `AUTOPRINT_RELAY_DATA` / `AUTOPRINT_RELAY_BIND`. Supply secrets through your deployment secret manager. Do not commit them. The default listener is loopback; deploy behind a maintained HTTPS reverse proxy for remote webhook delivery.

The relay currently supports one explicit owner/store configuration. Agent consumption, device enrollment, authenticated long-poll/WebSocket delivery, renewable leases, expiration, multi-device race prevention and a WordPress companion are **not implemented**. Polling remains standalone and does not depend on this service. Do not deploy two independent agents against the same store/routing responsibility expecting cross-device deduplication.
