# Database schema

The executable schema is in `crates/persistence/migrations/0001_initial.sql` and `0002_drafts_and_automatic_claims.sql`. SQLx tracks migration checksums. Never edit a released migration; add a new version.

| Table | Purpose/invariant |
|---|---|
| stores/printers/papers/rules/settings | Valid JSON configuration keyed by ID |
| templates | Latest published template |
| template_versions | Immutable (template ID, version) publication |
| template_drafts | Unpublished work, separate from automation |
| orders | Unique (store, WooCommerce order) |
| checkpoints | One durable UTC watermark per store |
| jobs | Unique identity, constrained states, immutable JSON snapshot |
| attempts | Unique (job, attempt), durable side-effect history |
| automatic_claims | Persistent logical output latch independent of current template version |
| webhook_events/relay_events/relay_devices | Optional notification storage; coordination remains limited |

Job claiming and attempt insertion occur in one transaction. Order updates, automatic claim insertion, job creation and watermark advancement commit together. Foreign keys prevent orphaned attempt/order rows. Historical snapshots do not require retaining an active printer profile.

Backups use SQLite VACUUM INTO and exclude credentials. They still contain customer data. Offline restore checks integrity and required tables and preserves a recovery backup. Automated retention/deletion policies are not implemented yet; do not assume data expires automatically.
