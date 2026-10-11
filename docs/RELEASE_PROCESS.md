# Release process

`scripts/prepare-bundle.mjs` builds locked, optimized engine/relay binaries and prepares target sidecars/icons. Platform shell/batch scripts then build macOS app/DMG, Debian .deb, Fedora/Red Hat family .rpm, or Windows NSIS/MSI packages and collect checksums under `artifacts/`. Windows NSIS cross-compilation is available from an isolated Linux container. See [building](BUILDING.md) and [recorded build evidence](BUILD_REPORT.md). Production distribution must use provisioned signing/notarization credentials and independently satisfy all release gates.

Checklist:

- [x] Native macOS source compiles; optimized engine/relay build
- [x] Unsigned macOS arm64 .app and DMG generated
- [x] Rust formatting/lint/tests; frontend checks/build/tests; real-agent browser acceptance
- [x] Frontend advisory audit reports zero known vulnerabilities
- [ ] Rust advisory/full dependency-license audit complete
- [ ] All mandatory product requirements complete
- [x] Linux arm64 .deb/.rpm and Windows x64 NSIS installers built and payloads inspected
- [ ] Native Windows/Linux GUI and physical printer acceptance completed
- [ ] Physical device matrix verified
- [ ] All translations and typography baselines reviewed
- [ ] Signed/notarized installers and signed update infrastructure
- [ ] Upgrade interruption/rollback/privacy/retention/end-to-end release validation

The review build is not a production release. Do not publish it as universally compatible or production-ready. CI covers available build/test prerequisites, but a workflow definition is not evidence it has run on another OS.
