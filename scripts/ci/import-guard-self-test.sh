#!/usr/bin/env bash
# Drops a temp file that imports node:child_process and asserts the guard fails,
# then runs the rest of the specifier cases.
set -euo pipefail
cd "$(dirname "$0")/../.."

probe="$(mktemp -d)"
cleanup() { rm -rf "$probe"; }
trap cleanup EXIT

mkdir -p "$probe/src"
printf '%s\n' 'import "node:child_process"' > "$probe/src/ci-mutation-probe.ts"

set +e
node scripts/ci/import-guard.mjs "$probe"
status=$?
set -e

if [[ "$status" -eq 0 ]]; then
  echo "mutation self-test failed: guard accepted a temp file importing node:child_process" >&2
  exit 1
fi

echo "mutation self-test passed: guard rejected node:child_process import (exit ${status})"
node scripts/ci/import-guard-self-test.mjs
