# Release process

`scripts/prepare-bundle.mjs` builds optimized engine/relay binaries, copies host-target sidecars and verifies runtime presence. `scripts/build-macos.sh` then builds app+DMG without signing for local review. Production distribution must use provisioned signing/notarization credentials and independently satisfy all release gates.

Checklist:

- [x] Native macOS source compiles; optimized engine/relay build
- [x] Unsigned macOS arm64 .app and DMG generated
- [x] Rust formatting/lint/tests; frontend checks/build/tests; real-agent browser acceptance
- [x] Frontend advisory audit reports zero known vulnerabilities
- [ ] Rust advisory/full dependency-license audit complete
- [ ] All mandatory product requirements complete
- [ ] Windows/Linux installers built and tested
- [ ] Physical device matrix verified
- [ ] All translations and typography baselines reviewed
- [ ] Signed/notarized installers and signed update infrastructure
- [ ] Upgrade interruption/rollback/privacy/retention/end-to-end release validation

The review build is not a production release. Do not publish it as universally compatible or production-ready. CI covers available build/test prerequisites, but a workflow definition is not evidence it has run on another OS.
