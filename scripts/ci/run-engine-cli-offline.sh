#!/usr/bin/env bash
# Engine and CLI tests, plus a hostile-fixture scan. Run this under with-netns.sh.
# Golden-corpus repositories are never scanned. Missing packages are a skip.
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "Offline engine/CLI run as uid $(id -u)"

run_tests() {
  local pkg=$1
  if [[ ! -f "$pkg/package.json" ]]; then
    echo "SKIP: $pkg is not in this revision; tests not run"
    return 0
  fi
  if ! node --input-type=module -e 'import fs from "node:fs"; const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if (!pkg.scripts || typeof pkg.scripts.test !== "string") process.exit(1);' "$pkg/package.json"; then
    echo "SKIP: $pkg has no test script"
    return 0
  fi
  echo "Running $pkg tests offline"
  (cd "$pkg" && npm test --offline)
}

run_tests packages/engine
run_tests packages/cli

fixtures="$(node scripts/ci/list-hostile-fixtures.mjs)"
if [[ -z "$fixtures" ]]; then
  echo "SKIP: no hostile fixture directories outside the golden corpus; scan not run"
  exit 0
fi

if [[ ! -f packages/cli/package.json ]]; then
  echo "ERROR: hostile fixtures exist but packages/cli does not" >&2
  exit 1
fi

entry="$(node scripts/ci/cli-entry.mjs)"
while IFS= read -r fixture; do
  [[ -z "$fixture" ]] && continue
  if node --input-type=module -e 'import { isCorpusRel } from "./scripts/ci/corpus-paths.mjs"; process.exit(isCorpusRel(process.argv[1]) ? 0 : 1);' "$fixture"; then
    echo "ERROR: refusing to scan golden-corpus path $fixture" >&2
    exit 1
  fi
  echo "Scanning hostile fixture $fixture"
  if command -v strace >/dev/null 2>&1; then
    trace="$(mktemp)"
    strace -f -o "$trace" -e trace=execve,connect -- node "$entry" scan "$fixture"
    node scripts/ci/assert-strace-trace.mjs "$trace"
    rm -f "$trace"
  else
    node "$entry" scan "$fixture"
    echo "strace is not installed; syscall assertion skipped for $fixture"
  fi
done <<< "$fixtures"
