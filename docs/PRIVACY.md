# Privacy

Order/billing/shipping/item/notes data and immutable print snapshots are stored locally in SQLite. Generated PDFs/PNGs and source documents remain in the agent's artifacts directory. No telemetry or proprietary cloud service is required. The optional relay stores notification order IDs and requires separately configured deployment credentials.

Credentials reside in the OS vault and are excluded from database backups. Backups and printed artifacts still contain customer data; protect them with appropriate OS/device controls. Diagnostics exclude order payloads and credentials. CSV exports include operational identifiers/names and neutralize spreadsheet-formula prefixes.

Automatic retention and full customer-data deletion workflows are not implemented yet. Data currently persists until explicitly managed by the operator. Configuring a nominal retention value does not expire data. Avoid deploying where this exceeds your approved data policy. Logs contain operational messages and sanitized failures; support export is intentionally narrow.
