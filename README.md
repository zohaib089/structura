# Atlasmith

Atlasmith (formerly Structura) is a local-first tool for understanding code architecture: a TypeScript scan engine and CLI that write a deterministic `graph.json`, a static graph viewer, and an optional hosted dashboard. The repository on GitHub is still named [structura](https://github.com/zohaib089/structura).

## Quick start

Requires Node.js 22+ and npm.

Install workspace dependencies and build the engine and CLI from the repo root:

```sh
npm ci
npm run build
```

Run a scan of the current directory (output defaults to `.atlasmith/graph.json`):

```sh
npx atlasmith scan .
npx atlasmith scan . --report          # also writes report.json (offline analysis)
npx atlasmith scan . --strict-architecture
```

If `atlasmith` is not on your `PATH`, use `node packages/cli/dist/bin.js` instead of `npx atlasmith`.

Open the graph in the static viewer (no account, no upload):

```sh
npm --prefix apps/web run dev:viewer
```

Build the viewer and open `apps/web/dist-viewer/index.html` via `file://`, or use the Compose service below.

### Docker Compose (hosted dashboard)

From the repo root (requires Docker):

```sh
docker compose up --build
```

| Service | URL | Notes |
| --- | --- | --- |
| web | http://localhost:5173 | Vite dev server; proxies API |
| api | http://localhost:4100 | Fastify API (Postgres + Mailpit) |
| viewer | http://localhost:8080 | Built static graph viewer (`nginx`) |
| Mailpit | http://localhost:8025 | Dev SMTP inbox (verification, OTP, password reset) |
| Postgres | localhost:5432 | DB `structuradb`, user `structura` |

Compose defaults use placeholder dev credentials (`POSTGRES_PASSWORD` defaults to `structura-dev-password`). Override via environment variables; do not commit real secrets.

**Sign in:** open http://localhost:5173, choose **Log in** or **Sign up**, and complete email verification or email OTP. Messages appear in Mailpit at http://localhost:8025. Google, Microsoft, and GitHub SSO are not configured on this stack.

Build context is the repository root so `npm ci -w <workspace>` uses the root `package-lock.json`.

Further detail: [apps/web/README.md](apps/web/README.md) (viewer and hosted UI).

## CLI commands

Run `atlasmith --help` for the full option list. Exit codes: `0` ok, `1` runtime, `2` usage or unsupported graph version, `3` accounting failure, `4` strict failure, `130` interrupted.

### `scan`

```sh
atlasmith scan [path|git-url] [options]
```

Walks a repository (or shallow-clones an `https://github.com/…` or `https://gitlab.com/…` URL; optional `--branch`). Writes `graph.json` and `run.json` under `.atlasmith/` by default. Parses TypeScript, JavaScript/TSX, and Python sources.

Notable flags:

- `--out`, `--meta`, `--no-meta`, `--json` — output paths and run metadata
- `--strict` — exit `4` when coverage rules fail (failed parses or timeouts)
- `--strict-architecture` — exit `4` when declared architecture rules fail
- `--config <path>` — architecture/limit config (default: `<root>/atlasmith.yml`)
- `--report` — write `report.json` next to `graph.json` (offline scan analysis)
- `--include`, cache flags, and limit overrides (`--max-files`, `--jobs`, …)

Private Git clones may use `GITHUB_TOKEN` or `GITLAB_TOKEN` in the environment.

Graph contract: [packages/engine/docs/graph-json-v1.md](packages/engine/docs/graph-json-v1.md). Engine behaviour and limits: [docs/inputs/engine-inputs.md](docs/inputs/engine-inputs.md).

### `query` and `explain`

```sh
atlasmith query .atlasmith/graph.json --kind file --limit 20
atlasmith query .atlasmith/graph.json --type imports --from src/app.ts
atlasmith explain .atlasmith/graph.json src/app.ts [--json]
```

`query` lists nodes or edges from an existing graph. `explain` prints one node’s kind, span, provenance, edges, and coverage.

### `export`

```sh
atlasmith export --format mermaid --graph .atlasmith/graph.json > deps.mmd
atlasmith export --format structurizr --graph .atlasmith/graph.json
atlasmith export --format likec4 --graph .atlasmith/graph.json
atlasmith export --format svg --graph .atlasmith/graph.json --out graph.svg
atlasmith export --format obsidian --graph .atlasmith/graph.json --out ./notes
```

Formats: `mermaid`, `structurizr`, `likec4`, `obsidian`, `svg`. Default graph path: `./.atlasmith/graph.json`. Obsidian export requires `--out` as a directory; other formats write to stdout unless `--out` is set.

### `impact`

```sh
atlasmith impact src/app.ts --graph .atlasmith/graph.json
atlasmith impact MySymbol --depth 5 --json
```

Resolves a repo-relative file path or symbol name and walks import/reexport paths upstream and downstream up to `--depth` (default 3, max 16). Exit `2` if the target is missing or ambiguous.

### `bench`

Compare model answers with and without `graph.json` in the prompt (token counts and scoring). See [packages/cli/docs/bench.md](packages/cli/docs/bench.md).

```sh
atlasmith bench --questions packages/cli/fixtures/bench/example-questions.json \
  --graph .atlasmith/graph.json --dry-run --out bench-results.json
```

### `mcp`

Read-only MCP server over stdio on a scanned `graph.json`:

```sh
npm run build -w @atlasmith/cli
atlasmith mcp --graph path/to/.atlasmith/graph.json
```

Default graph: `./.atlasmith/graph.json`. Tools: `list_modules`, `file_deps`, `symbol_lookup`, `architecture_findings`, `impact_lite`. No writes and no network after startup.

**Claude Code** — `~/.claude/settings.json` or project `.mcp.json`:

```json
{
  "mcpServers": {
    "atlasmith": {
      "command": "atlasmith",
      "args": ["mcp", "--graph", "/absolute/path/to/.atlasmith/graph.json"]
    }
  }
}
```

**Cursor** — `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "atlasmith": {
      "command": "atlasmith",
      "args": ["mcp", "--graph", "${workspaceFolder}/.atlasmith/graph.json"]
    }
  }
}
```

**Codex CLI** — `~/.codex/config.toml`:

```toml
[mcp_servers.atlasmith]
command = "atlasmith"
args = ["mcp", "--graph", "/absolute/path/to/.atlasmith/graph.json"]
```

Use `node /path/to/structura/packages/cli/dist/bin.js` when the CLI is not on your `PATH`. Point `--graph` at a new file after each rescan.

## Declared architecture (`atlasmith.yml`)

Place `atlasmith.yml` at the repository root (or pass `--config`). The scan reads an `architecture` section and attaches module assignments and drift findings to `graph.json`. With `--strict-architecture`, any violation fails the command with exit code `4`.

Example:

```yaml
architecture:
  defaultPolicy: deny-undeclared
  modules:
    - name: api
      paths: ["src/api/**"]
      allow: [core]
    - name: core
      paths: ["src/core/**"]
```

Module names match `^[a-z][a-z0-9-]*$`. Each module has required `paths` globs; optional `allow` and `deny` lists name other modules that may or may not be imported. Per-module or top-level `policy` / `defaultPolicy` may be `deny-undeclared` or `allow-undeclared`. You may use `layers` instead of `modules` with the same entry shape.

The same file may also list numeric limits (`maxFileSizeBytes: 1048576`, and similar keys) that **lower** engine defaults only; they cannot raise ceilings or change hard excludes. CLI flags can override limits upward within the ceiling.

## Dashboard: open project and report

In the hosted app (Compose or `npm --prefix apps/web run dev` with API running), sign in and open a workspace. Use the **Architecture** section to **Open project**:

- **Local** — choose a folder (or zip upload in browsers without directory picker support); build folders such as `node_modules` and `.git` are skipped when zipping.
- **GitHub** / **GitLab** — paste an `https://github.com/…` or `https://gitlab.com/…` URL and an optional branch; the server ingests the remote source.

When a scan succeeds, the hub loads graph insights and a **Project report** view: folder tree, severity badges, category tabs aligned with `report.json` v1, filters, optional architecture graph preview, analyser run status, and client-side export of the filtered view as JSON or Markdown. The CLI `--report` flag produces the same `report.json` shape locally without the dashboard.

## Privacy

The scan **engine** and **CLI** do not send telemetry and do not make network calls during a normal directory scan (see [docs/inputs/engine-inputs.md](docs/inputs/engine-inputs.md)). Scanning a remote Git URL uses HTTPS clone. Optional `bench` adapters may call external model APIs unless you use `--dry-run`.

The **static viewer** loads `graph.json` locally and does not upload it. The **hosted dashboard** uploads only the sources you explicitly open for server-side scanning; use the CLI and viewer for fully local workflows.

## Licence

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
