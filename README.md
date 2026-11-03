# Structura

Monorepo for the Atlasmith scan engine, CLI, hosted apps, and static graph viewer.

## Atlasmith CLI usage

From the repo root after `npm run build`:

```sh
node packages/cli/dist/bin.js scan .
node packages/cli/dist/bin.js query .atlasmith/graph.json --kind file
node packages/cli/dist/bin.js explain .atlasmith/graph.json src/app.ts
node packages/cli/dist/bin.js export --format mermaid --graph .atlasmith/graph.json
node packages/cli/dist/bin.js export --format obsidian --graph .atlasmith/graph.json --out ./notes
```

`export` reads `graph.json` v1 (default `./.atlasmith/graph.json`) and writes diagram or note formats to stdout, except Obsidian export which requires `--out` as a directory. Supported `--format` values: `mermaid`, `structurizr`, `likec4`, `obsidian`, `svg`. Exit code `2` indicates usage or an invalid format; `1` indicates a runtime error.

## Local stack (Docker Compose)

From the repo root (requires Docker):

```sh
docker compose up --build
```

| Service | URL | Notes |
| --- | --- | --- |
| web | http://localhost:5173 | Vite dev server; proxies API |
| api | http://localhost:4100 | Fastify API (Postgres + Mailpit) |
| viewer | http://localhost:8080 | Built static graph viewer (`nginx`) |
| Mailpit | http://localhost:8025 | Dev SMTP inbox |
| Postgres | localhost:5432 | DB `structuradb`, user `structura` |

Compose defaults use placeholder dev credentials (`POSTGRES_PASSWORD` defaults to `structura-dev-password`). Override via environment variables; do not use real secrets in the checked-in defaults.

Build context is the repository root so `npm ci -w <workspace>` uses the root `package-lock.json`.

## Atlasmith MCP server (graph.json)

After a local scan, expose the resulting `graph.json` to AI tools through a read-only MCP server on stdio:

```sh
npm run build -w packages/cli
atlasmith mcp --graph path/to/.atlasmith/graph.json
```

When `--graph` is omitted, the default is `./.atlasmith/graph.json` under the current working directory.

Tools: `list_modules`, `file_deps`, `symbol_lookup`, `architecture_findings`, and `impact_lite`. The server loads and validates graph.json v1 once at startup; tool calls do not write files or use the network.

### Claude Code

Add to `~/.claude/settings.json` (or project `.mcp.json`):

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

Use `node /path/to/structura/packages/cli/dist/bin.js` instead of `atlasmith` when the CLI is not on your `PATH`.

### Cursor

Project or user MCP config (`.cursor/mcp.json`):

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

### Codex CLI

In `~/.codex/config.toml`:

```toml
[mcp_servers.atlasmith]
command = "atlasmith"
args = ["mcp", "--graph", "/absolute/path/to/.atlasmith/graph.json"]
```

Replace paths with your scan output. Regenerate or point `--graph` at a new file after each rescan.
