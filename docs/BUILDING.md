# Build installers

Run scripts from any working directory. They resolve the repository root, install
the locked npm dependencies, fetch the pinned Typst runtime/fonts, compile the
Rust agent and relay with `--locked`, prepare sidecars/icons, and build the Tauri
application. Installers and standalone agent/relay binaries are collected under
`artifacts/<platform>-<rust-host>/` with `SHA256SUMS` and a build manifest.

Android is excluded from this task at the owner's request. This application has
a desktop process model and does not currently provide an Android build target.

| Target                | Native command               | Outputs                 |
| --------------------- | ---------------------------- | ----------------------- |
| macOS                 | `sh scripts/build-macos.sh`  | `.app`, verified `.dmg` |
| Debian/Ubuntu         | `sh scripts/build-debian.sh` | `.deb`                  |
| Fedora/Red Hat family | `sh scripts/build-redhat.sh` | `.rpm`                  |
| Windows x64           | `scripts\build-windows.bat`  | NSIS `.exe`, WiX `.msi` |

Each native script accepts `--check` to check the host/toolchain and Linux
libraries without compiling, or `--skip-bootstrap` to reuse already installed
npm dependencies, Typst and fonts. `--skip-bootstrap` still compiles the software
and prepares its sidecars. Windows Git Bash can use `sh scripts/build-windows.sh`.

## Prerequisites

All hosts need Rust (the checked-in dependencies were built with 1.99.0), Node.js
24 or later, npm, Python 3 (`python3` on Unix, `python` on Windows), `curl`, and
`tar`. A repository-local Rust installation in `.tools/cargo` and `.tools/rustup`
takes precedence over the Rust installation on `PATH`. Network access is required
on the first build. The scripts do not install global toolchains or OS packages.

macOS needs Xcode Command Line Tools. Builds use the host architecture; use an
Intel Mac with x64 Node/Rust for Intel packages and Apple Silicon with arm64
Node/Rust for arm64 packages. The resulting review artifacts are unsigned and
unnotarized.

Install Linux native libraries explicitly before the first native build:

```sh
sh scripts/install-linux-deps.sh debian
# Or on Fedora / a compatible Red Hat family host:
sh scripts/install-linux-deps.sh redhat
```

These commands use `sudo` when necessary. Linux requires GTK 3, WebKitGTK 4.1,
AppIndicator, DBus, OpenSSL and libxdo development packages. Red Hat derivatives
must provide those packages through their configured repositories. An RPM built
on Fedora is not evidence of compatibility with every RHEL version. Build on
the oldest distribution you intend to support and validate its runtime libraries.
See the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/),
[Debian packaging](https://v2.tauri.app/distribute/debian/), and
[RPM packaging](https://v2.tauri.app/distribute/rpm/).

Windows needs x64 Node.js, the `x86_64-pc-windows-msvc` Rust toolchain, Microsoft
C++ Build Tools with the Desktop development with C++ workload, and WebView2.
MSI packaging also needs the VBSCRIPT optional Windows feature. Before building,
set the path to your independently verified portable SumatraPDF helper:

```bat
set "AUTOPRINT_SUMATRA=C:\build-tools\SumatraPDF.exe"
scripts\build-windows.bat
```

SumatraPDF's applicable source and license must accompany distribution. The
build script deliberately does not select or download an unverified helper.
The native batch script requires a Windows host. MSI generation requires
Windows. An experimental NSIS cross-build is also available from Linux/macOS,
following [Tauri's cross-compilation guide](https://v2.tauri.app/distribute/windows-installer/).

## Linux containers from macOS, Linux, or Windows Git Bash

With Docker Engine/Desktop running:

```sh
sh scripts/build-linux-container.sh debian arm64
sh scripts/build-linux-container.sh redhat arm64
# For x86-64 packages (emulation can take substantially longer on Apple Silicon):
sh scripts/build-linux-container.sh debian amd64
sh scripts/build-linux-container.sh redhat amd64
```

The images use Debian 12 or Fedora 43, Rust 1.99, and Node 24. Source is mounted
read-only, copied into an isolated container, and built without reusing host
`node_modules`, sidecars or Cargo outputs. Only `artifacts/` is mounted writable.
Containers are removed after the build; toolchain images remain in Docker's
cache. The default architecture is arm64; always supply `amd64` when targeting
x86-64. Reserve adequate disk space and memory for the Rust/GTK build. The
container defaults to two concurrent Cargo jobs.

If crates.io requests time out on your network, select a sparse registry mirror
for the isolated build container:

```sh
AUTOPRINT_CARGO_MIRROR=https://rsproxy.cn/index/ sh scripts/build-linux-container.sh debian arm64
```

The same variable works with `build-windows-container.sh`. Cargo verifies crate
checksums from the lockfile. Container network requests default to a 30-second
timeout; set `CARGO_HTTP_TIMEOUT` to override it. The Windows image also adds the
pinned NSIS 3.11 Restart Manager header required by Tauri's installer template.

## Windows NSIS cross-build

On this Apple Silicon build host, run:

```sh
sh scripts/build-windows-container.sh
# If the official Rust binary endpoint is unreachable, select a mirror explicitly:
RUSTUP_DIST_SERVER=https://rsproxy.cn sh scripts/build-windows-container.sh
```

This reuses the Debian arm64 toolchain image, installs LLVM/LLD and NSIS, and
uses cargo-xwin 0.23.1 with its published archive checksum. cargo-xwin downloads
Microsoft SDK files for the build. The container enables its license-acceptance
option for this build toolchain. This path produces a Windows **x64** installer
from an **arm64 Linux** build host; it does not produce an MSI.

The cross-build helper bootstrap downloads official SumatraPDF 3.6.1, verifies
the archive against the SHA-256 recorded for that HTTPS download, and collects
its pinned source archive, license, and provenance alongside the installer.
This establishes the downloaded archive's identity; it does not establish
Windows runtime or printer compatibility. The portable helper is documented by
[SumatraPDF](https://www.sumatrapdfreader.org/docs/SumatraPDF-portable).

For a manually provisioned Linux/macOS cross toolchain, set `AUTOPRINT_SUMATRA`
and run `sh scripts/build-windows-cross.sh`. It requires cargo-xwin, LLVM/LLD,
NSIS, and the `x86_64-pc-windows-msvc` Rust target. Native Windows users should
use the batch script to obtain both installer formats. Container builds use an
automatic lock in `artifacts/` so several requested targets can queue without
compiling concurrently in a small Docker VM.

## Verify and distribute

`npm run verify` checks TypeScript, lint, four frontend tests and the production
frontend build. `sh scripts/cargo.sh test --locked --workspace --exclude
autoprint-desktop` runs the core Rust tests after toolchain installation.
Compilation and installer generation do not validate physical printers or
live-store behavior. See [release gates](RELEASE_PROCESS.md).

Linux container builds also check native agent startup, authenticated health,
and clean shutdown in disposable data. To run the same smoke test manually:

```sh
python3 scripts/smoke-agent.py --agent target/release/autoprint-agent \
  --renderer .tools/bin/typst --fonts assets/fonts
```

The build scripts produce local review packages. Configure signing and
notarization separately for distribution; the scripts explicitly use
`tauri build --no-sign`. Installer filenames use the configured application
version rather than a hard-coded version.
