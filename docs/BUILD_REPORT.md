# Platform build verification — 2026-10-11

WooCommerce AutoPrint 0.1.0 was compiled and packaged for the following targets.
Android was excluded at the owner's request. These are unsigned local review
artifacts, not a production release.

| Target                        | Build environment                                                  | Package in `artifacts/`                                                       | Evidence                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| macOS arm64                   | Apple Silicon, Rust 1.99.0, Node 26.5                              | `macos-aarch64-apple-darwin/WooCommerce AutoPrint_0.1.0_arm64.dmg` and `.app` | Native compile, DMG internal checksum validation, arm64 binary inspection, packaged agent authenticated startup and clean shutdown |
| Debian arm64                  | Debian 12 container, Rust 1.99.0, Node 24                          | `debian-aarch64-unknown-linux-gnu/WooCommerce AutoPrint_0.1.0_arm64.deb`      | Native Linux compile, package metadata/payload inspection, engine and renderer startup smoke check                                 |
| Fedora / Red Hat family arm64 | Fedora 43 container, Rust 1.99.0, Node 24                          | `redhat-aarch64-unknown-linux-gnu/WooCommerce AutoPrint-0.1.0-1.aarch64.rpm`  | Native Linux compile, RPM digest/metadata/payload inspection, engine and renderer startup smoke check                              |
| Windows x64                   | arm64 Linux cross-build, cargo-xwin 0.23.1, LLVM 14, Microsoft SDK | `windows-x86_64-pc-windows-msvc/WooCommerce AutoPrint_0.1.0_x64-setup.exe`    | Full application compile, NSIS generation, archive extraction confirming four x64 executable payloads and seven fonts              |

All four artifact directories contain standalone engine/relay binaries,
`SHA256SUMS`, and a build manifest. Their SHA-256 checks passed. The Windows
directory also contains the pinned SumatraPDF 3.6.1 source archive, license and
download provenance. The NSIS bootstrap executable is 32-bit; its application,
engine, Typst renderer and SumatraPDF payloads are x64.

Validation also completed:

- TypeScript checking, ESLint, four frontend unit tests, and the production frontend build.
- Twenty core Rust tests in the optimized profile, with no failures.
- Native agent health/shutdown tests using disposable data on macOS and both Linux build hosts.
- JavaScript/Python and shell syntax checks, argument/host guards, and `git diff --check`.

Windows executables were inspected but not run on a Windows host. Native Linux
GUI behavior, live WooCommerce stores and physical printers were not exercised
in this build session. Fedora-built RPMs require compatible runtime libraries;
they are not evidence of compatibility with every RHEL derivative or release.
Windows MSI generation is available through the native batch script and needs
a Windows host. macOS packages are unnotarized.

Build scripts and prerequisites are documented in [BUILDING.md](BUILDING.md).
The container scripts snapshot their entry code, preserve completed artifacts
on failure, and support an explicitly selected sparse Cargo registry mirror.
The Windows image supplies the checksum-pinned NSIS Restart Manager header
required by Tauri's current installer template.

Detailed build logs are retained locally in `.tools/build-logs/` (ignored by Git):
`macos.log`, `debian-final.log`, `redhat-final.log`, `windows.log`,
`windows-package.log`, and `rust-tests.log`. Windows installer generation was
retried using the saved application binary after correcting the missing NSIS
include; the resulting installer payload and checksums passed inspection.
