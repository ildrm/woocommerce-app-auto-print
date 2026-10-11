#!/bin/sh
# Experimental Windows x64 NSIS cross-build on an arm64 Linux container host.
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TASK_DOCKER_ROOT=$TASK_ROOT
if command -v cygpath >/dev/null 2>&1; then
  TASK_DOCKER_ROOT=$(cygpath -m "$TASK_ROOT")
  export MSYS_NO_PATHCONV=1
fi
docker info >/dev/null
mkdir -p "$TASK_ROOT/artifacts"
docker build --platform linux/arm64 -f "$TASK_DOCKER_ROOT/scripts/docker/Dockerfile.debian" -t autoprint-build-debian:arm64 "$TASK_DOCKER_ROOT"
docker build --platform linux/arm64 \
  --build-arg "RUSTUP_DIST_SERVER=${RUSTUP_DIST_SERVER:-https://static.rust-lang.org}" \
  -f "$TASK_DOCKER_ROOT/scripts/docker/Dockerfile.windows" -t autoprint-build-windows:arm64 "$TASK_DOCKER_ROOT"
docker run --rm --platform linux/arm64 \
  -e "AUTOPRINT_CARGO_MIRROR=${AUTOPRINT_CARGO_MIRROR:-}" \
  -e "CARGO_HTTP_TIMEOUT=${CARGO_HTTP_TIMEOUT:-30}" \
  --mount "type=bind,source=$TASK_DOCKER_ROOT,target=/source,readonly" \
  --mount "type=bind,source=$TASK_DOCKER_ROOT/artifacts,target=/output" \
  autoprint-build-windows:arm64 sh -c '
    cp /source/scripts/docker/build-in-container.sh /tmp/autoprint-build.sh
    sh /tmp/autoprint-build.sh windows
    TASK_RESULT=$?
    if [ -d /workspace/artifacts ]; then cp -R /workspace/artifacts/. /output/; fi
    exit "$TASK_RESULT"
  '
