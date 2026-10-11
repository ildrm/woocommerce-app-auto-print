#!/bin/sh
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec node "$TASK_ROOT/scripts/build-desktop.mjs" redhat "$@"
