#!/bin/sh
# Requires cargo-xwin, LLVM/LLD, NSIS, the Windows Rust target, and the PDF helper.
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec node "$TASK_ROOT/scripts/build-desktop.mjs" windows --cross-windows "$@"
