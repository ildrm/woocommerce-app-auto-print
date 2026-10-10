# User guide

1. Open AutoPrint. The dashboard shows actual agent/configuration/job state. If offline, use Diagnostics → Start engine in the native app, or start the CLI agent in development.
2. Open Stores → Connect a store. Enter a name, final HTTPS URL and read-only WooCommerce consumer credentials. Test and connect before enabling automation.
3. Open Printers → Discover or Add. Select an OS queue, compatible network transport, or PDF destination. Name it, choose paper/template/document language and copies, then save.
4. Open Paper Manager for custom dimensions/margins/offsets. Save the paper profile and assign it to your printer. Confirm the real printer supports that media.
5. Preview a template using the actual generated artifact. Print a fictional test document and inspect the physical output or exported PDF.
6. Create a Routing Rule for your store/printer/template and allowed order conditions. Automatic printing requires payment confirmation unless explicitly overridden. Enable the rule and the store's automation switch.
7. Monitor Print Queue/History. Submitted means transport acceptance. Outcome uncertain requires printer inspection; explicit reprint creates a fresh copy marker/generation. Pause does not erase queued work.

Template Designer edits flow-based blocks without source code. Review real Preview before publication. Draft edits preserve live published versions. Use Shift multi-selection, grouping, layer order, bindings and conditions. Imported packages are bounded JSON; remote assets/code are unavailable.

Settings controls language/theme and native login startup. Non-English translation previews disclose missing coverage. Reports export formula-safe CSV. Diagnostics exports narrow system checks and creates credential-free SQLite backups that still contain customer data. Offline restore: stop the engine, then run `python3 scripts/restore-backup.py DATA BACKUP`.
