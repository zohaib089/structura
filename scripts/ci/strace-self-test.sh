#!/usr/bin/env bash
# Fixture traces for the strace assertion. Does not require the strace binary.
set -euo pipefail
cd "$(dirname "$0")/../.."

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

expect_ok() {
  local name=$1
  local body=$2
  printf '%s\n' "$body" > "$tmp/trace"
  if node scripts/ci/assert-strace-trace.mjs "$tmp/trace" >/dev/null; then
    echo "accepted: $name"
  else
    echo "expected accept: $name" >&2
    exit 1
  fi
}

expect_reject() {
  local name=$1
  local body=$2
  printf '%s\n' "$body" > "$tmp/trace"
  if node scripts/ci/assert-strace-trace.mjs "$tmp/trace" >/dev/null 2>&1; then
    echo "expected reject: $name" >&2
    exit 1
  fi
  echo "rejected: $name"
}

expect_ok "one node execve and unix socket" $'123 execve("/usr/bin/node", ["node", "scan"], 0x1) = 0\n123 connect(4, {sa_family=AF_UNIX, sun_path="/tmp/x"}, 16) = 0'
expect_reject "af_inet connect" $'123 execve("/usr/bin/node", ["node"], 0x1) = 0\n123 connect(4, {sa_family=AF_INET, sin_port=htons(443), sin_addr=inet_addr("1.1.1.1")}, 16) = -1 ENETUNREACH (Network is unreachable)'
expect_reject "af_inet6 connect" $'123 execve("/usr/bin/node", ["node"], 0x1) = 0\n123 connect(4, {sa_family=AF_INET6, sin6_port=htons(443)}, 28) = -1 ENETUNREACH (Network is unreachable)'
expect_reject "second successful execve" $'123 execve("/usr/bin/node", ["node"], 0x1) = 0\n124 execve("/bin/git", ["git"], 0x1) = 0'
expect_ok "failed extra execve ignored" $'123 execve("/usr/bin/node", ["node"], 0x1) = 0\n123 execve("/bin/git", ["git"], 0x1) = -1 ENOENT (No such file or directory)'
expect_reject "empty trace" ''
echo "strace assertion self-test passed"
