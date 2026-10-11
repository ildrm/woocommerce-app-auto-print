#!/bin/sh
# For Windows Git Bash; the batch entry point does not require Bash.
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec node "$TASK_ROOT/scripts/build-desktop.mjs" windows "$@"
