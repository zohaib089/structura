#!/usr/bin/env bash
# Install packages/engine and packages/cli with network, lifecycle scripts ignored.
# Rebuild only allowlisted dependency names and a local binding.gyp, if any.
set -euo pipefail
cd "$(dirname "$0")/../.."

found=0
for pkg in packages/engine packages/cli; do
  if [[ ! -f "$pkg/package.json" ]]; then
    echo "SKIP: $pkg/package.json does not exist; nothing to install"
    continue
  fi
  found=1
  if [[ ! -f "$pkg/package-lock.json" ]]; then
    echo "ERROR: $pkg has package.json but no package-lock.json; refusing an unlocked install" >&2
    exit 1
  fi
  echo "Installing $pkg with npm ci --ignore-scripts"
  (cd "$pkg" && npm ci --ignore-scripts)

  while IFS= read -r raw || [[ -n "${raw:-}" ]]; do
    line="${raw%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    if [[ -d "$pkg/node_modules/$line" ]]; then
      echo "Rebuilding allowlisted package $line in $pkg"
      (cd "$pkg" && npm rebuild "$line")
    else
      echo "Allowlisted package $line is not installed in $pkg; skipping"
    fi
  done < scripts/ci/rebuild-allowlist.txt

  if [[ -f "$pkg/binding.gyp" ]]; then
    name="$(node -p "require('./${pkg}/package.json').name")"
    echo "Rebuilding native addon $name in $pkg"
    (cd "$pkg" && npm rebuild "$name")
  fi
done

if [[ "$found" -eq 0 ]]; then
  echo "packages/engine and packages/cli are not in this revision. Install skipped."
fi
