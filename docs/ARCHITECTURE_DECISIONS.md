# Architecture decisions

1. **Separate engine executable.** Tauri-managed sidecar lifetime is insufficient for independent background operation. A spawned child is not killed when the GUI exits; a reaper thread handles child completion. Explicit user-level service registration is available.
2. **SQLite as authority.** Configuration, normalized orders, watermarks, automatic claims, job snapshots and attempt records are durable. Hardware side effects occur only after a committing `submitting` transition.
3. **Uncertain outcomes remain terminal for automatic retries.** Neither TCP write success nor spooler acceptance proves a printed page. Users explicitly create a new reprint generation after inspection.
4. **Packaged Typst CLI.** It provides the same PDF/raster layout and OpenType/bidi shaping across platforms, with a bounded subprocess and pinned fonts. All source is generated from validated literal data; imported Typst/code/packages are prohibited.
5. **Flow template editing.** Ordinary receipt/invoice authors can create documents without JSON. Absolute-position/page-master design, resize handles and snap/alignment guides remain incomplete, rather than being represented by inert controls.
6. **Capability honesty.** Native discovered queues are marked unverified; advanced driver settings are not invented. Direct IPP and ESC/POS need physical validation before production use.
7. **Secrets outside exports.** WooCommerce credentials use the user's OS vault. Missing/unavailable vaults fail closed; there is no insecure plaintext fallback.
