#!/bin/sh
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TASK_DOCKER_ROOT=$TASK_ROOT
if command -v cygpath >/dev/null 2>&1; then
  TASK_DOCKER_ROOT=$(cygpath -m "$TASK_ROOT")
  export MSYS_NO_PATHCONV=1
fi
TASK_PLATFORM=${1:-}
TASK_ARCH=${2:-arm64}
case "$TASK_PLATFORM" in debian|redhat) ;; *) printf '%s\n' 'Usage: sh scripts/build-linux-container.sh debian|redhat [arm64|amd64]' >&2; exit 2 ;; esac
case "$TASK_ARCH" in arm64|amd64) ;; *) printf '%s\n' 'Architecture must be arm64 or amd64' >&2; exit 2 ;; esac
docker info >/dev/null
mkdir -p "$TASK_ROOT/artifacts"
TASK_IMAGE="autoprint-build-$TASK_PLATFORM:$TASK_ARCH"
docker build --platform "linux/$TASK_ARCH" -f "$TASK_DOCKER_ROOT/scripts/docker/Dockerfile.$TASK_PLATFORM" -t "$TASK_IMAGE" "$TASK_DOCKER_ROOT"
docker run --rm --platform "linux/$TASK_ARCH" \
  -e "AUTOPRINT_CARGO_MIRROR=${AUTOPRINT_CARGO_MIRROR:-}" \
  -e "CARGO_HTTP_TIMEOUT=${CARGO_HTTP_TIMEOUT:-30}" \
  --mount "type=bind,source=$TASK_DOCKER_ROOT,target=/source,readonly" \
  --mount "type=bind,source=$TASK_DOCKER_ROOT/artifacts,target=/output" \
  "$TASK_IMAGE" sh -c '
    cp /source/scripts/docker/build-in-container.sh /tmp/autoprint-build.sh
    sh /tmp/autoprint-build.sh "$1"
    TASK_RESULT=$?
    if [ -d /workspace/artifacts ]; then cp -R /workspace/artifacts/. /output/; fi
    exit "$TASK_RESULT"
  ' autoprint-build "$TASK_PLATFORM"
