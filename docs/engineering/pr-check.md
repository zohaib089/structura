# PR architecture check

Workflow: `.github/workflows/pr-check.yml`. Roadmap item R5.

On every pull request the check:

1. Builds `packages/engine` and `packages/cli` on a GitHub-hosted runner.
2. Scans the PR merge commit and its base (`HEAD^1`) with `atlasmith scan --strict-architecture --no-cache --no-meta --out <runner temp>`.
3. Lists changed files with `git diff --name-status -z --no-renames HEAD^1 HEAD` and traces the files that depend on them with the engine walk behind `atlasmith impact` (`graphImpact`, downstream, default depth 3). Deleted files are traced on the base graph.
4. Renders one Markdown comment (`packages/cli/src/pr-comment.ts`, driven by `scripts/pr-check/render-comment.mjs`): the rules broken, each with a "why it matters" and "how to fix" line and a new/already-on-base tag, the affected files, or a short all-clear.
5. Creates or updates a single comment on the PR, found by the hidden marker `<!-- atlasmith-pr-check -->` on a comment written by `github-actions[bot]`.
6. Fails the check when the scan exits 4, meaning declared architecture rules are broken. With no `atlasmith.yml` there are no rules, so the check only reports impact.

Golden-corpus paths (`scripts/ci/golden-corpus-paths.txt` and any `golden-corpus` directory) are removed from the throwaway checkout before scanning, so they are never scanned.

## Why `pull_request` and not `pull_request_target`

`pull_request_target` runs with a write token and secrets in the context of the base branch. Checking out and running PR code there lets a fork PR take over the token. This repo never uses it.

The workflow uses `pull_request` and splits the work into two jobs:

| Job | Permissions | Runs PR code? | Does |
| --- | --- | --- | --- |
| `scan` | `contents: read` | yes | install, build, scan, render; passes the comment as a base64 job output and writes it to the job summary |
| `comment` | `pull-requests: write` | no (no checkout) | decodes the text, checks the marker and size, creates or updates the comment with `gh api` and the `GITHUB_TOKEN` |

The workflow default is `permissions: {}`. Checkouts use `persist-credentials: false`. Installs use `npm ci --ignore-scripts`. Only SHA-pinned `actions/checkout` and `actions/setup-node` are used, plus the preinstalled `gh`. There are no secrets and no third-party services.

For PRs from forks, and for Dependabot, GitHub only grants a read-only token, so the `comment` job is skipped and the same text is in the `scan` job summary. A more involved `workflow_run` design could post on forks too. It needs an artifact hand-off (`actions/upload-artifact` and `download-artifact`), which this workflow deliberately avoids.

## What leaves the runner

Nothing but the comment: file paths, module names, rule names, and line numbers. No source text, graph, or report is uploaded, and the scan makes no network calls.

## Local preview

```bash
bash scripts/ci/install-engine-cli.sh
npm --prefix packages/cli run pretest && npm --prefix packages/cli run build
node packages/cli/dist/bin.js scan . --strict-architecture --no-cache --no-meta --out /tmp/am-head
git diff --name-status -z --no-renames origin/main HEAD > /tmp/am-changed.z
node scripts/pr-check/render-comment.mjs --head-graph /tmp/am-head/graph.json --changed /tmp/am-changed.z --out /tmp/am-comment.md
```

The exact comment text for a rule-breaking PR and a clean PR is pinned in `packages/cli/fixtures/pr-check/expected/`. Run `PR_COMMENT_UPDATE=1 npm --prefix packages/cli test` to regenerate it after changing the wording.
