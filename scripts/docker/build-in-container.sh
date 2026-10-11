#!/bin/sh
set -eu
TASK_PLATFORM=$1
export CARGO_HTTP_MULTIPLEXING=${CARGO_HTTP_MULTIPLEXING:-false}
export CARGO_HTTP_TIMEOUT=${CARGO_HTTP_TIMEOUT:-30}
if [ -n "${AUTOPRINT_CARGO_MIRROR:-}" ]; then
  node --input-type=module -e '
    import { writeFileSync } from "node:fs";
    const registry = new URL(process.env.AUTOPRINT_CARGO_MIRROR);
    if (registry.protocol !== "https:" || !registry.pathname.endsWith("/")) {
      throw new Error("AUTOPRINT_CARGO_MIRROR must be an HTTPS sparse registry URL ending in /");
    }
    writeFileSync("/usr/local/cargo/config.toml", "[source.crates-io]\nreplace-with = \"build-mirror\"\n[source.build-mirror]\nregistry = " + JSON.stringify("sparse+" + registry.href) + "\n");
  '
fi
# Desktop Rust linking can exhaust small Docker VMs when several targets run.
# flock releases automatically on exit, including a failed or interrupted build.
if [ "${AUTOPRINT_BUILD_LOCKED:-0}" != 1 ]; then
  printf '%s\n' "Waiting for the container build slot: $TASK_PLATFORM"
  export AUTOPRINT_BUILD_LOCKED=1
  exec flock -x /output/.container-build.lock sh "$0" "$@"
fi
# Copy only source; never mix macOS node_modules, sidecars, or Cargo outputs with Linux.
tar -C /source --exclude=.git --exclude=.tools --exclude=target \
  --exclude=node_modules --exclude=dist --exclude=artifacts --exclude=.data \
  --exclude=.codebase-memory --exclude=apps/desktop/src-tauri/binaries \
  --exclude=apps/desktop/src-tauri/icons -cf - . | tar -C /workspace -xf -
cd /workspace
if [ "$TASK_PLATFORM" = windows ]; then
  node scripts/fetch-sumatra.mjs
  export AUTOPRINT_SUMATRA=/workspace/.tools/bin/SumatraPDF.exe
  sh scripts/build-windows-cross.sh
else
  node scripts/build-desktop.mjs "$TASK_PLATFORM"
  python3 scripts/smoke-agent.py --agent target/release/autoprint-agent \
    --renderer .tools/bin/typst --fonts assets/fonts
fi
cp -R artifacts/. /output/
