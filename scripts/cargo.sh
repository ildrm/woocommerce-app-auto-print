#!/bin/sh
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ -x "$TASK_ROOT/.tools/cargo/bin/cargo" ]; then
  export CARGO_HOME="$TASK_ROOT/.tools/cargo" RUSTUP_HOME="$TASK_ROOT/.tools/rustup"
  export PATH="$CARGO_HOME/bin:$PATH"
fi
exec cargo "$@"
