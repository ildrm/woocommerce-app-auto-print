#!/bin/sh
# Explicitly run this on the build host; ordinary build scripts never use sudo.
set -eu
TASK_PLATFORM=${1:-}
if [ "$(id -u)" -eq 0 ]; then set --; else set -- sudo; fi
case "$TASK_PLATFORM" in
  debian)
    "$@" apt-get update
    "$@" apt-get install -y build-essential pkg-config curl ca-certificates \
      python3 file xz-utils libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
      librsvg2-dev libxdo-dev libdbus-1-dev libssl-dev patchelf
    ;;
  redhat)
    "$@" dnf install -y gcc gcc-c++ make pkgconf-pkg-config curl ca-certificates \
      python3 file xz tar webkit2gtk4.1-devel libappindicator-gtk3-devel \
      librsvg2-devel libxdo-devel dbus-devel openssl-devel patchelf rpm-build
    ;;
  *) printf '%s\n' 'Usage: sh scripts/install-linux-deps.sh debian|redhat' >&2; exit 2 ;;
esac
