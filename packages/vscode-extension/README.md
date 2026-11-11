# Atlasmith VS Code extension (E1)

Local-only, read-only graph of the current file or the whole project. Works in VS Code, Cursor, and VSCodium.

The product name in the UI is Atlasmith. The scan runs on this computer with `@atlasmith/engine`. There is no sign-in, no network use, and no telemetry.

## What E1 includes

- Editor title-bar graph icon: **Atlasmith: Show graph for this file**
- Activity Bar view **Atlasmith graph** with **Show graph for this file** and **Show whole project graph**
- A webview that reuses the Vue viewer (`ViewerApp` / `GraphCanvas` in embedded mode)
- Consent before the first scan of a folder, remembered in `workspaceState`
- Empty, loading, error, and "file not in the graph" states in plain language

Out of scope: rescan on save, impact alerts, duplicate warnings, packaging, and marketplace publishing.

## Develop

From the repository root:

```bash
npm install
npm run build -w packages/engine
npm install --prefix packages/vscode-extension
npm run typecheck -w packages/vscode-extension
npm test -w packages/vscode-extension
npm run build -w packages/vscode-extension
```

The webview bundle also needs `apps/web` dependencies (it imports the viewer source, it does not copy it). Open this folder in VS Code / Cursor / VSCodium and use **Run Extension** once a launch config is added; until then, build the package and use **Install from VSIX** only if you package it yourself. This package is not published.

## Privacy

Scans write cache and `graph.json` under the extension's storage directory (or a temporary directory), not into the project, unless you later choose otherwise.
