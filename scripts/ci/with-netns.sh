#!/usr/bin/env bash
# Run a command inside an empty network namespace, then drop root.
# Ubuntu 24.04 blocks unprivileged user namespaces, so this uses sudo and setpriv.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: scripts/ci/with-netns.sh <command> [args...]" >&2
  exit 2
fi

exec sudo unshare --net -- \
  setpriv --reuid "$(id -u)" --regid "$(id -g)" --clear-groups -- \
  env PATH="$PATH" HOME="$HOME" NPM_CONFIG_UPDATE_NOTIFIER=false \
  "$@"
