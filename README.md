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
