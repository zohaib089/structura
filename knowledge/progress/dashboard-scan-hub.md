# Dashboard scan hub (frontend)

## Summary

The hosted dashboard now drives workspace scans from the Architecture section and a compact overview widget:

- Open project flow (local folder zip, direct `.zip` upload, GitHub URL, GitLab URL, optional branch)
- Per-workspace scan list with status and errors
- Graph insights loaded from `GET /workspaces/:id/scans/:scanId/graph`
- Open viewer handoff via sessionStorage (static viewer drag-and-drop unchanged)

## API client

All scan calls live in `apps/web/src/api/scans.ts` behind the existing bearer-session fetch envelope.

## Follow-ups

- Backend endpoints and retention policy must land before production use.
- Scan UI strings are English-only for now (`scan-messages.ts`).
- Project report UI (`ScanReportPanel`) is stacked on the scan hub; requires report API from PR #18.
