# Plain-English Q&A

A scan can answer short, plain-English questions about its `graph.json` with no AI, no network, and no extra analysis pass. The engine function is deterministic: the same graph and question always produce the same answer.

The implementation lives in `packages/engine/src/graph/qa.ts` and is exported as `answerGraphQuestion` from `@atlasmith/engine`. It does not change `GRAPH_SCHEMA_VERSION` and does not write anything back into the graph. Optional sections added in later minors (`hotspots` in 1.2.0, `quality` in 1.3.0, `duplicates` in 1.4.0, plus `architecture` and `docSummary`) are read when present and get a clear fallback when they are absent, so the same function works on graph.json 1.4.0 and on earlier schemas.

## Response shape

```ts
type GraphQaIntent =
  | 'impact'
  | 'explain'
  | 'hotspots'
  | 'quality'
  | 'duplicates'
  | 'architecture'
  | 'overview'
  | 'fallback'

interface GraphQaCitation {
  kind: 'file' | 'folder' | 'symbol'
  path: string
  name?: string
  startLine?: number
  endLine?: number
}

interface GraphQaResponse {
  intent: GraphQaIntent
  answer: string
  citations: GraphQaCitation[]
  suggestions: string[]
}
```

`answer` is plain English. `citations` are exact file, folder, or symbol references (repo-relative `path`, optional `name` and inclusive 1-based line span). `suggestions` are follow-up questions grounded in what the graph actually contains (for example, it will not suggest “Where is code duplicated?” when the graph has no `duplicates` section).

## Intents

Targets (files, folders, and symbols) are resolved from exact path, path suffix, basename, or symbol name. Missing and ambiguous targets get a polite message that lists the candidates instead of guessing.

1. **Impact** (`impact`) — “What breaks if I change X?”, “What depends on X?”. Walks `walkFileImpact` downstream (importers) from the file, the symbol’s file, or the files in a folder.
2. **File explanation** (`explain`) — “What does X do?”, “What does X import/use?”. Uses `docSummary` when present, plus symbols, imports and importers, architecture findings, and a hotspot score if the file has one.
3. **Riskiest files** (`hotspots`) — “What are the riskiest files?”. Reads `graph.hotspots`. If that section is missing, the answer says so rather than inventing scores.
4. **Quality** (`quality`) — “How healthy is the project?”, “How do I raise the score?”, “Worst folders?”. Reads `graph.quality` (project score, tips, folder scores). Same graceful fallback when the section is missing.
5. **Duplicated code** (`duplicates`) — “Where is code duplicated?”. Reads `graph.duplicates`. Fallback when the section is missing or empty.
6. **Cycles and architecture** (`architecture`) — “Any circular imports?”, “Any architecture rule breaks?”. Import cycles are detected from the graph’s file-level import edges even on older schemas. Rule findings come from `graph.architecture.findings` when that section exists.
7. **Overview** (`overview`) — “What languages does this use?”, “Where does the app start?”. File counts, languages, top-level folders, and likely entry points (or files that nothing else imports).
8. **Fallback** (`fallback`) — anything else, including an empty question. Explains what can be asked and offers example questions based on the data that is present.

## Hosted API

`POST /api/workspaces/:workspaceId/scans/:scanId/ask` with `{ "question": string }`.

The route is authenticated and read-only. Access checks match the other scan routes: `401` without a session, `404` when the workspace or scan is not visible, `409` when the scan is still queued or running, and `404` when a finished scan has no graph.

The question is trimmed. A missing, empty, or non-string question, or one longer than 500 characters, returns `400`.

A successful response is:

```json
{
  "success": true,
  "intent": "explain",
  "answer": "src/app.ts is a TypeScript file…",
  "citations": [{ "kind": "file", "path": "src/app.ts" }],
  "suggestions": ["What breaks if I change src/app.ts?"]
}
```
