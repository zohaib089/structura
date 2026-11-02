# Dashboard scan report UI

## Summary

The Architecture scan hub adds a **Project report** view (alongside graph insights) for succeeded scans:

- Typed client for `GET /api/workspaces/:id/scans/:scanId/report` with the same bearer envelope as scans/graph, including 409 not-ready handling.
- Interactive folder/file tree with aggregated severity badges, optional hierarchy graph preview, detail panel, category tabs mapped to `report.json` v1, filters, and client-side JSON/Markdown export of the filtered view.

Stacked frontend work targets backend contract in PR #18.

## Gaps / notes

- UI does not surface per-analyser status rows from `analysers` yet (schema provides them; a summary strip can follow).
- History tab renders `history` payload tables; history-section **findings** render below when present.
