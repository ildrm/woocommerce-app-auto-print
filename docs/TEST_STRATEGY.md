# Test strategy and evidence

Verified on macOS arm64 with repository-local Rust 1.99.0, Node 26 and Typst 0.15.1. No physical printer or live WooCommerce credentials were supplied.

- Rust suite: 20 tests covering paper conversion/bounds, decimal comparisons, job transition honesty, template validation/bindings, webhook/token/private-file protection, migrations/backups, transactional duplicate claims, uncertain recovery, WooCommerce mock pagination/auth/precision, raster/IPP wire contracts, and actual multilingual document generation.
- Frontend: four unit tests for physical geometry, invalid numeric input, CSV formula protection and localization fallback; TypeScript, ESLint and Vite production build.
- Browser: five real-agent acceptance tests covering dashboard/responsive layout, exact imperial paper persistence, visual editing/undo/redo/artifact preview/publication, durable PDF jobs/history, and Persian RTL switching.
- Real-agent integration script: authentication, exclusive instance, seven saved language artifacts, exact A4 MediaBox, durable PDF completion/attempt history, credential-free backup and restart without duplicate submission.

Run commands are in README.md. E2E data is disposable and isolated. Fixtures are fictional. Artifact generation is separate from semantic typography/physical hardware proof. There is no approved golden-image visual-regression comparison yet; checked-in images are generated evidence, not fabricated approved references.

Further gates: live API edge cases, full fault injection during each side-effect window, IPP/device contracts, all-language shaping/order assertions, full onboarding/metadata/relay/device workflows, cross-platform installers, accessibility and hardware tests. Tests must be extended when those features are implemented.
