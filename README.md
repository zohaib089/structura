# Structura

Monorepo for the Atlasmith scan engine, CLI, hosted apps, and static graph viewer.

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
