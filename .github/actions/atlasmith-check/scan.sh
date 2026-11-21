#!/usr/bin/env bash
# Scan the checkout with the Atlasmith CLI and render the sticky PR comment.
# Reads only local files besides the optional clone of the action's own repo
# (when this checkout is not the Atlasmith monorepo). No comment is posted here.
set -euo pipefail

is_true() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    true|yes|on|strict|1) return 0 ;;
    *) return 1 ;;
  esac
}

is_atlasmith_monorepo() {
  local root="$1"
  [[ -f "$root/packages/cli/package.json" ]] || return 1
  [[ -f "$root/scripts/pr-check/render-comment.mjs" ]] || return 1
  grep -q '"name": "@atlasmith/cli"' "$root/packages/cli/package.json"
}

resolve_scan_root() {
  local raw="${ATLASMITH_WORKING_DIRECTORY:-.}"
  if [[ "$raw" == /* ]]; then
    printf '%s' "$raw"
  else
    printf '%s' "$(cd "${GITHUB_WORKSPACE:-.}" && cd "$raw" && pwd)"
  fi
}

fetch_action_tooling() {
  local dest="$1"
  local repo="${ATLASMITH_ACTION_REPOSITORY:-zohaib089/structura}"
  local ref="${ATLASMITH_ACTION_REF:-}"
  echo "Installing Atlasmith CLI from https://github.com/${repo}${ref:+@$ref}"
  rm -rf "$dest"
  mkdir -p "$dest"
  git init --quiet "$dest"
  git -C "$dest" remote add origin "https://github.com/${repo}.git"
  GIT_TERMINAL_PROMPT=0 git -C "$dest" fetch --depth 1 --quiet origin "${ref:-HEAD}"
  git -C "$dest" checkout --quiet FETCH_HEAD
}

depth="${ATLASMITH_IMPACT_DEPTH:-3}"
if ! [[ "$depth" =~ ^[0-9]+$ ]]; then
  echo "::error::impact-depth must be a non-negative integer, got: $depth"
  exit 2
fi

work="${RUNNER_TEMP:-/tmp}/atlasmith"
mkdir -p "$work"

scan_root="$(resolve_scan_root)"
git_root="$(git -C "$scan_root" rev-parse --show-toplevel)"

cli_source="$(printf '%s' "${ATLASMITH_CLI_SOURCE:-auto}" | tr '[:upper:]' '[:lower:]')"
tooling=""
case "$cli_source" in
  workspace)
    tooling="$git_root"
    if ! is_atlasmith_monorepo "$tooling"; then
      echo "::error::cli-source=workspace but this checkout is not the Atlasmith monorepo"
      exit 2
    fi
    ;;
  action)
    tooling="$work/tooling"
    fetch_action_tooling "$tooling"
    ;;
  auto|"")
    if is_atlasmith_monorepo "$git_root"; then
      tooling="$git_root"
      echo "Using Atlasmith CLI from this checkout"
    else
      tooling="$work/tooling"
      fetch_action_tooling "$tooling"
    fi
    ;;
  *)
    echo "::error::cli-source must be auto, workspace, or action, got: $cli_source"
    exit 2
    ;;
esac

if [[ ! -f "$tooling/scripts/ci/install-engine-cli.sh" ]]; then
  echo "::error::Atlasmith install script not found in $tooling"
  exit 1
fi

bash "$tooling/scripts/ci/install-engine-cli.sh"
npm --prefix "$tooling/packages/cli" run pretest
npm --prefix "$tooling/packages/cli" run build

if ! git -C "$git_root" rev-parse --verify --quiet HEAD^1 >/dev/null; then
  echo "::error::HEAD^1 is missing. Check out the pull request merge commit with fetch-depth: 2."
  exit 1
fi

git -C "$scan_root" diff --name-status -z --no-renames --relative HEAD^1 HEAD > "$work/changed.z"
git -C "$git_root" worktree add --detach "$work/base-tree" HEAD^1

base_scan="$work/base-tree"
if [[ "$scan_root" != "$git_root" ]]; then
  rel="${scan_root#"$git_root"/}"
  base_scan="$work/base-tree/$rel"
fi

if [[ -f "$tooling/scripts/pr-check/strip-corpus.mjs" ]]; then
  CI=true node "$tooling/scripts/pr-check/strip-corpus.mjs" "$git_root"
  CI=true node "$tooling/scripts/pr-check/strip-corpus.mjs" "$work/base-tree"
fi

strict_args=()
if is_true "${ATLASMITH_STRICTNESS:-true}"; then
  strict_args+=(--strict-architecture)
fi

cli="$tooling/packages/cli/dist/bin.js"
if [[ ! -f "$cli" ]]; then
  echo "::error::Atlasmith CLI was not built at $cli"
  exit 1
fi

set +e
node "$cli" scan "$scan_root" "${strict_args[@]}" --no-cache --no-meta --out "$work/head" > "$work/head.log" 2>&1
head_code=$?
set -e
cat "$work/head.log"
echo "scan_exit=$head_code" >> "$GITHUB_OUTPUT"
if [[ "$head_code" -ne 0 && "$head_code" -ne 4 ]]; then
  echo "::error::atlasmith scan failed with exit code $head_code"
  exit 1
fi

set +e
node "$cli" scan "$base_scan" "${strict_args[@]}" --no-cache --no-meta --out "$work/base" > "$work/base.log" 2>&1
base_code=$?
set -e
cat "$work/base.log"
if [[ "$base_code" -ne 0 && "$base_code" -ne 4 ]]; then
  echo "::warning::base scan failed (exit $base_code); the comment will not mark which rule breaks are new"
  rm -f "$work/base/graph.json"
fi

sha_args=()
if [[ -n "${HEAD_SHA:-}" ]]; then
  sha_args+=(--sha "$HEAD_SHA")
fi

node "$tooling/scripts/pr-check/render-comment.mjs" \
  --head-graph "$work/head/graph.json" \
  --base-graph "$work/base/graph.json" \
  --changed "$work/changed.z" \
  --depth "$depth" \
  "${sha_args[@]}" \
  --out "$work/comment.md"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat "$work/comment.md" >> "$GITHUB_STEP_SUMMARY"
fi

{
  echo 'comment_b64<<ATLASMITH_EOF'
  base64 -w0 "$work/comment.md"
  echo
  echo 'ATLASMITH_EOF'
} >> "$GITHUB_OUTPUT"
