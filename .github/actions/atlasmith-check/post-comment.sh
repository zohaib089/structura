#!/usr/bin/env bash
# Create or update the sticky Atlasmith PR comment.
# This script never checks out or runs repository code. It only posts text.
set -euo pipefail

if [[ -z "${COMMENT_B64:-}" ]]; then
  echo "No comment to post."
  exit 0
fi

if [[ -z "${PR_NUMBER:-}" ]]; then
  echo "Not a pull request event; skipping sticky comment. The same text is in the job summary."
  exit 0
fi

# Fork and Dependabot runs get a read-only token. Do not fail the check.
if [[ "${SKIP_COMMENT:-}" == "true" ]]; then
  echo "Skipping sticky comment (fork pull request, Dependabot, or no write token). The same text is in the job summary."
  exit 0
fi

if [[ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]]; then
  echo "No token available; skipping sticky comment. The same text is in the job summary."
  exit 0
fi

body="${RUNNER_TEMP:-/tmp}/atlasmith-pr-comment.md"
printf '%s' "$COMMENT_B64" | base64 -d > "$body"
marker='<!-- atlasmith-pr-check -->'
if [[ "$(head -n 1 "$body")" != "$marker" ]]; then
  echo "::error::rendered comment does not start with the marker; refusing to post"
  exit 1
fi
if [[ "$(wc -c < "$body")" -gt 65000 ]]; then
  echo "::error::rendered comment is over the GitHub size limit"
  exit 1
fi

if ! ids="$(gh api --paginate "repos/$REPO/issues/$PR_NUMBER/comments" \
  --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | startswith(\"$marker\"))) | .id")"; then
  echo "::warning::Could not list pull request comments (the token may be read-only). Skipping sticky comment. The same text is in the job summary."
  exit 0
fi

id="${ids%%$'\n'*}"
if [[ -n "$id" ]]; then
  if ! gh api --method PATCH "repos/$REPO/issues/comments/$id" -F "body=@$body" > /dev/null; then
    echo "::warning::Could not update the sticky comment. The same text is in the job summary."
    exit 0
  fi
  echo "Updated comment $id"
else
  if ! gh api --method POST "repos/$REPO/issues/$PR_NUMBER/comments" -F "body=@$body" > /dev/null; then
    echo "::warning::Could not create the sticky comment. The same text is in the job summary."
    exit 0
  fi
  echo "Created a new comment"
fi
