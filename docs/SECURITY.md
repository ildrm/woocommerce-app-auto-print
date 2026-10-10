# Security review

Trust boundaries: WooCommerce HTTPS; local WebView → Rust → authenticated agent; imported template data → validated compiler; generated artifacts → hardware adapters; signed webhook → notification storage; OS vault → commerce client only.

Implemented controls include HTTPS-only remote stores, disabled redirects, read-only credential guidance, OS-vault secrets with zeroized Rust containers, no token/secret API responses, constant-time IPC token checks, loopback binding, private Unix data/runtime files, exclusive engine locks, parameterized SQL, constrained table names/states, bounded request/response/template/raster sizes, subprocess deadlines, structured retry states, signed webhook verification, no imported executable templates and path-restricted artifacts.

Security review found and fixed integer-bound issues in margins/calibration, ambiguous form labeling, RTL telephone ordering, template-draft/live-version coupling, and repeated automatic output across configuration revisions. npm audit reported zero known vulnerabilities after upgrading the test runner. Rust advisory audit was not completed: cargo-audit installation stalled on network index access and was stopped to unblock verification. Do not interpret successful Rust lint/tests as an advisory scan.

Remaining release blockers include Windows ACL review, unattended vault behavior on each OS, OS/IPP device validation, full malicious-template/resource stress tests, complete dependency/license audit, signed updates, and independent security review. No arbitrary network/filesystem/shell command is exposed to the WebView.

Same-user malicious processes are outside the current local-file isolation boundary. Protect the OS account and data directory. Never share ipc.json or raw database/backups; only the redacted diagnostics endpoint is intended for support export.
