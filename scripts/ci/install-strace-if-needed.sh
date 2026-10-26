#!/usr/bin/env bash
# Install strace only when a hostile fixture directory exists to scan.
set -euo pipefail
cd "$(dirname "$0")/../.."

fixtures="$(node scripts/ci/list-hostile-fixtures.mjs)"
if [[ -z "$fixtures" ]]; then
  echo "SKIP: no hostile fixtures to scan; strace not installed"
  exit 0
fi

if command -v strace >/dev/null 2>&1; then
  echo "strace already installed"
  exit 0
fi

sudo DEBIAN_FRONTEND=noninteractive apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y strace
