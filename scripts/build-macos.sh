#!/bin/sh
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$TASK_ROOT"
if [ -x "$TASK_ROOT/.tools/cargo/bin/cargo" ]; then
  export CARGO_HOME="$TASK_ROOT/.tools/cargo" RUSTUP_HOME="$TASK_ROOT/.tools/rustup" PATH="$TASK_ROOT/.tools/cargo/bin:$PATH"
fi
node scripts/prepare-bundle.mjs
npm exec -w apps/desktop -- tauri build --bundles app --no-sign
TASK_STAGE="$TASK_ROOT/.tools/dmg-stage"
mkdir -p "$TASK_STAGE"
ditto "$TASK_ROOT/target/release/bundle/macos/WooCommerce AutoPrint.app" "$TASK_STAGE/WooCommerce AutoPrint.app"
if [ ! -e "$TASK_STAGE/Applications" ]; then ln -s /Applications "$TASK_STAGE/Applications"; fi
mkdir -p "$TASK_ROOT/target/release/bundle/dmg"
hdiutil create -ov -volname "WooCommerce AutoPrint" -srcfolder "$TASK_STAGE" -format UDZO "$TASK_ROOT/target/release/bundle/dmg/WooCommerce AutoPrint_0.1.0_aarch64.dmg"
hdiutil verify "$TASK_ROOT/target/release/bundle/dmg/WooCommerce AutoPrint_0.1.0_aarch64.dmg"
