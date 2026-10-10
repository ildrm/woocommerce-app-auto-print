# Troubleshooting

| Symptom | Action |
|---|---|
| Engine offline | Start from native Diagnostics or launch agent with the correct data directory; inspect exclusive lock/runtime paths |
| Store rejects connection | Check final HTTPS URL, read permission, keys, API access and pagination headers; redirects are intentionally disabled |
| Vault unavailable | Unlock/configure the user's OS credential store; there is no plaintext fallback |
| No orders appear | New stores synchronize near the present, not all historical orders; run Sync now and inspect connection health |
| No automatic jobs | Enable store automation and matching rule; verify WooCommerce payment date, enabled printer and published template |
| Queued test remains | Save/enable its printer profile; workers currently enumerate configured destinations |
| Rendering fails | Check packaged Typst/fonts, schema fields, dimensions, effective margins, supported actual-size output and size limits |
| Printer submission uncertain | Inspect physical output/spooler before choosing an intentional reprint; never blindly retry |
| Wrong paper | Use a supported driver/media, match actual-size setup, inspect PDF geometry, and reassign edited paper to printer |
| Missing translation | English fallback is intentional; coverage is displayed in Settings |
| Browser verification unavailable | Use an installed Chrome via AUTOPRINT_CHROME; test CDN may deny local region access |

Do not share ipc.json, raw databases, artifacts or credentials in support channels. Export the narrow Diagnostics report. Reports/UI list only the latest 500 records; do not treat this as a complete historical accounting report.
