# Changelog

## 0.1.0 (unreleased)

- First local build of the Atlasmith extension for VS Code, Cursor and VSCodium.
- File and project graphs in a webview, using the shared Atlasmith radial and linear viewer.
- Consent before the first scan; scans run locally with no telemetry.
- Narrow-pane layout: tighter labels, a compact search button, and a fit that keeps the centre file in view.
- Packaging: esbuild-bundled extension host with the Atlasmith engine vendored alongside (tree-sitter wasm and parse workers resolve at runtime).
- Requires VS Code 1.101 or newer (Node 22 extension host).
