# Performance limits

The engine uses bounded four-store/four-printer concurrency and serial work per destination. API bodies are bounded to 2 MB; WooCommerce pages to 16 MB; imported templates to 500 nodes/12 levels; barcode/QR content and raster dimensions are bounded. Typst subprocesses have a 60-second deadline and kill-on-drop behavior. Output permits at most 100 raster pages and 40 MB/page, with a preflight 40-megapixel estimate.

These are resource limits, not benchmark guarantees. Continuous-roll height estimation, comprehensive allocation limits and stress-test profiling require more work. Font bundles are about tens of megabytes; the macOS app bundle measured roughly 115 MiB and the initial DMG roughly 61 MiB. Exact final build sizes should be read from the current artifacts.

The GUI polls local state every three seconds and renders at most 500 recent orders/jobs. Reports are based on those retained/returned records, not a complete warehouse analytics query. High-volume history paging and broad performance measurements remain incomplete.
