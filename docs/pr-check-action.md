# Add the Atlasmith PR check to your repository

This repository exposes a reusable [composite GitHub Action](https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action) that runs the same pull-request check we use on Atlasmith: it scans the pull request, traces the files the change can affect, and keeps one plain-English comment up to date.

It is **not** published on the GitHub Marketplace. Point at the action by its path in this repository, and pin `<ref>` to a commit SHA (or a tag, when one exists):

```yaml
uses: zohaib089/structura/.github/actions/atlasmith-check@<ref>
```

A fuller description of what the comment contains, and of how this repository runs the check, is in [docs/engineering/pr-check.md](engineering/pr-check.md).

## Add it in a few lines

Create `.github/workflows/atlasmith-check.yml` in your repository:

```yaml
name: Atlasmith PR check

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions: {}

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: zohaib089/structura/.github/actions/atlasmith-check@<ref>
```

The action checks out the pull-request merge commit (`fetch-depth: 2`, credentials not persisted), installs the Atlasmith CLI from the same ref you pinned, scans your repository, writes the comment to the job summary, and posts or updates the sticky PR comment when the token can write.

## Permissions and fork safety

Use the `pull_request` trigger. **Do not** use `pull_request_target`, and do not check out pull-request code in a job that has secrets.

No secrets are required. The default `GITHUB_TOKEN` is enough to post a comment on pull requests from the same repository. Pull requests from forks, and Dependabot, get a read-only token; the action skips the comment instead of failing, and the same text is in the job summary.

Give the job only what it needs:

| Permission | Why |
| --- | --- |
| `contents: read` | Check out and scan the pull request |
| `pull-requests: write` | Post or update the sticky comment. Omit this if you only want the job summary |

This repository uses a two-job workflow (scan with `contents: read` only, then a comment job with `pull-requests: write`) because it builds the CLI from the pull request itself. The short example above is appropriate when the CLI comes from the pinned action ref, not from the pull request.

## Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `strictness` | `true` | Run `atlasmith scan --strict-architecture`. Set to `false` to scan without that flag. |
| `impact-depth` | `3` | How many import hops to walk when listing files affected by the change. |
| `fail-on-findings` | `true` | Fail the job when the scan reports broken architecture rules (exit code 4). The comment is still rendered first. |
| `github-token` | `${{ github.token }}` | Token used to post the sticky comment. Not needed for read-only or fork runs. |
| `working-directory` | `.` | Project root to scan, relative to the checkout. |
| `checkout` | `true` | Check out the pull-request merge commit with `fetch-depth: 2` and `persist-credentials: false`. Set to `false` if the job already checked out the repository that way. |
| `post-comment` | `true` | Post or update the sticky comment (`<!-- atlasmith-pr-check -->`). Skipped gracefully when the token cannot write. |
| `comment-b64` | _(empty)_ | If set, skip the scan and only post this base64-encoded comment. Use this in a job that must not run the scan. |
| `cli-source` | `auto` | `auto` uses this monorepo's `packages/cli` when the checkout is Atlasmith, otherwise the CLI from the action's ref. `workspace` and `action` force one or the other. |

## Outputs

| Output | Meaning |
| --- | --- |
| `comment_b64` | The rendered comment, base64-encoded, so a later job can post it. |
| `scan_exit` | Scan exit code (`0` = clean, `4` = architecture rules broken). |
