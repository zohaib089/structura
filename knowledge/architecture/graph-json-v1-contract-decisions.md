# graph.json v1 contract: Tech Lead decisions (E-01, E-10, A-01)

Author: Tech Lead / Architect. Date: 2026-10-25. Status: **DECIDED for implementation** (these answer QA Q-1..Q-9, A-1..A-9, Q-26/27 and give provisional rulings on a few Backend/Frontend questions). Owners may push back with a PR against this file; silence means the decision stands. The product name is provisional, so nothing below depends on it.

Design stance in one line: **graph.json is a deterministic, closed, brand-free, source-text-free document; everything that varies between runs lives elsewhere.**

---

## 1. Decisions

### Q-1 / [A-1] Version field, compatibility policy, tool version
- Field: top-level `schemaVersion`, a **semver string** (`"1.0.0"`). Not an integer: we need minor vs major, and QA's CT-VER tests already assume it.
- **Patch**: editorial only (docs, description text, clarified wording). No change to any validator outcome.
- **Minor** (backward compatible for readers of the same major): new *optional* properties, new `extensions` namespaces, new enum values for node `kind` / edge `type` / `symbolKind` / skip `reason` (additive only).
- **Major**: removing or renaming a property, making an optional property required, changing a type, unit, id scheme, ordering rule or span convention, or removing an enum value.
- Reader policy (single function `readGraph()` in engine; viewer uses the same):
  - Major greater than supported: refuse with typed error `GraphVersionUnsupported` (CLI exit code 2, viewer VE-ERR-003).
  - Same major, higher or equal minor: accept; **ignore unknown properties** (stripped, not preserved; the reader is *not* lossless and says so); unknown node `kind` or edge `type` is kept and treated as a generic node/edge by consumers.
  - Same major, lower minor: accept; missing optional properties take documented defaults.
  - Major lower than supported: refuse unless a migrator exists (none planned for v1).
- Two validation modes, same schema source: `validateStrict` (Ajv `strict: true`, closed; used by the writer, CI, and contract tests; this is what "valid v1.x.y" means) and `readGraph` (tolerant to additions as above, strict on everything it knows).
- **No tool version in graph.json.** Tool version, timestamps, durations, host info go in run metadata (see Q-9). Reason: byte-identical output for identical input is a stronger property than traceability, and a tool-version field would change every graph on every upgrade. CT-VER-001 changes to: "output carries `schemaVersion`; run metadata carries tool version".
- Frozen canary `schema-fixtures/v1.0.0.graph.json` and `schema/SCHEMA_HASH` as QA proposed (CT-VER-005/006): accepted.

### Q-2 / [A-2] Strictness
- **Closed** (`additionalProperties: false` / `unevaluatedProperties: false`) at every object level in the producer schema: top level, node, edge, span, coverage entries.
- One escape hatch: optional `extensions` object on top level, node and edge. Keys must be namespaced `^[a-z][a-z0-9-]*:[A-Za-z0-9._-]+$` (for example `"acme:owner"`). Values: any JSON. The engine core never reads `extensions`; the viewer ignores unknown ones. Extensions still obey determinism (sorted keys) and the no-absolute-path rule.
- **No data-dependent object keys anywhere outside `extensions`.** Maps from ids/paths/languages to values are arrays of objects (for example `coverage.ignored: [{rule, count}]`). This kills the `__proto__`/`constructor` key class (CT-HOST-001) structurally. Reader additionally parses with a reviver/guard that rejects `__proto__`, `constructor`, `prototype` keys and a depth over 64.

### Q-3 / [A-3] Span and provenance on structural edges
Overrides QA's assumption on span, accepts it on provenance.
- Every edge has `provenance` (`EXTRACTED` | `INFERRED`). Structural edges (`contains`) are always `EXTRACTED`.
- `span` is required on every **non-structural** edge (`imports`, `reexports`, and any later `calls`/`inherits`): it is the evidence location in the *source* file. It is **forbidden** on `contains` edges: the child node already carries its own `span` (symbols) and the file/directory hierarchy has no source location; repeating it would bloat 200k-edge graphs for no information.
- `INFERRED` edges require `confidence` in (0, 1] and `reason` (short enum string, for example `"alias-heuristic"`, `"dynamic-import-pattern"`). `EXTRACTED` edges forbid both. Schema-enforced with `if/then`.
- No `defines` edge in v1. Use `contains` only (directory→directory/file, file→symbol, symbol→symbol for nesting). Fewer edge types, one hierarchy.
- Initial vocabulary (v1.0.0): node `kind`: `directory`, `file`, `symbol`, `external`, `unresolved`. Edge `type`: `contains`, `imports`, `reexports`. More arrive as minor versions.

### Q-4 / [A-4] Span units
Convention (same as Monaco/VS Code ranges, easy to convert for UI):
- `span = { start: {line, col}, end: {line, col} }`
- **line: 1-based. col: 1-based. Unit: UTF-16 code units** (matches JS string indexing in engine and viewer). **end is exclusive** (position just after the last character; zero-width span has `start == end`).
- Line terminator is `\n` only. `\r\n` is one break (the `\r` is a trailing character of the line); a lone `\r` is **not** a line break. This matches tree-sitter's row counting so adapters and the line index agree.
- A leading BOM is stripped before any offset is computed and is not counted.
- Invalid UTF-8 input is decoded with U+FFFD replacement (deterministic) and the file node is marked `decoding: "lossy"`.
- Bytes are never stored. Adapter owns conversion: `line = row + 1`, `col = utf16Column + 1`. Backend must prove with fixtures (astral emoji, CJK, combining marks, CRLF, BOM, lone CR) what web-tree-sitter actually reports for `column` in the build we pin, and convert; do not assume it is already code units.
- Integers only, no `-0`, no exponents. `start <= end`, `line <= file.lineCount`.
- File node `lineCount` = number of `\n` plus 1 (so `"a\n"` has 2).

### Q-5 Id scheme
Readable, path-based, stable, no hashes (diff-friendly, debuggable). Node id is a single string with a kind prefix.
- directory: `dir:<relpath>`; repo root is `dir:.`
- file: `file:<relpath>`; file id equals `"file:" + node.path`
- symbol: `sym:<file relpath>#<qualified.name>`; nesting joined by `.` (for example `sym:src/a.ts#Outer.method`)
  - duplicates in the same scope (overloads, redeclarations): first in source order keeps the plain name, the next get `~2`, `~3`
  - default export without a name: `#default`; other anonymous symbols: `#<anonymous:N>` where N is the 1-based source-order ordinal among anonymous siblings in that scope
- external: `ext:<ecosystem>:<package>` (for example `ext:npm:react`, `ext:pypi:requests`); the subpath or full specifier is kept on the edge as `specifier`
- unresolved: `unresolved:<importer relpath>::<specifier as written>` (relative specifiers resolve per importer, so the importer is part of the id)
- `<relpath>`: POSIX separators, relative to scan root, **NFC-normalised**, no leading `/`, no `..` or `.` segments, no backslash, no control characters. Paths that cannot be represented (invalid UTF-8, control chars, backslash in name) are **not** silently renamed: the file is skipped and counted in coverage with reason `unrepresentable-path`. Two paths that collide after NFC: the first in code-unit order keeps the id, the other is skipped with reason `id-collision` and counted.
- Edges have **no id**. Uniqueness key is `(source, type, target, span.start.line, span.start.col)`; for `contains` it is `(source, type, target)`.
- Ordering (CT-DET-007 confirmed): nodes sorted by `id`, edges by `(source, type, target, span.start.line, span.start.col)`, all by UTF-16 code-unit order, never `localeCompare`. Arrays inside nodes are sorted by their natural key.

### Q-6 `--include` vs ignores
Three layers, reported honestly:
1. **Hard excludes, never overridable**: the output dir, the cache dir, `.git`, and anything that resolves outside the scan root. Counted in coverage as `ignored: hard:<name>`.
2. **Default ignores** (`node_modules`, build output dirs, virtualenvs, `__pycache__`, and the repo's own `.gitignore` patterns, parsed in-process): overridable by an explicit `--include <glob>`.
3. Global git config and `core.excludesFile` are never read (also answers Q-14).
- Coverage reports every ignore rule that matched anything as `{rule, count}` with `rule` like `default:node_modules`, `gitignore:/dist`, `hard:.git`. Ignored files are counted, not given nodes. Non-ignored files always get a file node, including unsupported languages, so coverage is loud.

### Q-7 Threat model: symlinks and TOCTOU
In scope with a bounded promise. The scan root is untrusted *content*; we do not claim to defend against a **concurrently hostile local process** with write access to the repo during the scan.
- Symlinks are never followed; they are recorded and counted (`skipped: symlink`). Root itself is `realpath`ed once.
- Reads: open with `O_NOFOLLOW` where the platform has it (POSIX), then `fstat` the descriptor: must be a regular file and (dev, ino) must equal the earlier `lstat`. On Windows use `lstat` before/after and reparse-point checks; documented as best effort.
- Per directory: after opening, verify the directory's `realpath` is inside the root realpath.
- **Accepted residual risk**: an intermediate path component swapped to a symlink between the directory check and the file open. Consequence is limited because graph.json carries no source text (only names, paths, spans), so the worst case is an out-of-root identifier name appearing as a symbol name. Documented in the E-10 threat model; tests cover the swappable cases we can mitigate (final-component swap, directory swap before check), not the residual window.
- **Hard links accepted**: indistinguishable from regular files in Node, content is read only for parsing. Documented residual.

### Q-8 / git
**Confirmed: the engine and CLI never shell out to `git`, nor to any process.** No commit SHA stamp, no `git check-ignore`; `.gitignore` is parsed in-process. Enforced by lint (`no-restricted-imports` for `child_process`, `node:child_process`, `cluster`) in `packages/engine` and `packages/cli` plus a CI grep test. Anything that needs git (future blame/churn features) needs a superseding ADR with hardening (`-c core.fsmonitor= -c core.hooksPath=/dev/null`, scrubbed env). Parsing happens in WASM inside the process or a `worker_threads` worker (allowed).

### Q-9 Run-to-run variation
**Nothing varies inside graph.json.** No timestamps, durations, PIDs, hostnames, absolute paths, tool version, git SHA, brand strings. Run metadata (tool version, timings, counters, cache hit rate, warnings with absolute paths if needed) goes to `run.json` next to the output (default `<outDir>/run.json`, `--meta <path>` to move it, `--no-meta` to skip) and to `--json` stdout. Canonical serialisation: UTF-8 without BOM, 2-space indent, sorted keys at fixed positions as defined by the types below (property order is fixed by the writer, not alphabetical), `\n` line endings on all OS, single trailing `\n`, `JSON.stringify` on plain objects only. Incremental rescan must equal a clean scan **byte for byte** (Q-18: yes; if the invalidation model cannot guarantee it for some case, fall back to a full rescan for that case rather than relax the invariant).

### [A-8] Aggregated cluster-edge provenance
Derived in the viewer, never stored. Three states: `EXTRACTED` only if **all** underlying edges are EXTRACTED; `INFERRED` if all are INFERRED; **`MIXED`** otherwise. MIXED renders with the non-extracted style and a tooltip with the counts. An aggregate must never look more certain than its weakest member.

### [A-9] Invalid graph.json
**Fail the whole load.** No partial load, no skip-with-banner. Error carries the first 20 JSON-pointer paths. Exception: the additive tolerance in Q-1 for same-major higher-minor documents. Semantic checks (dangling endpoints, duplicate ids, count mismatches, span bounds, `contains` cycles) are part of load validation, not optional.

### Q-26 Naming and brand centralisation
- One module: `packages/engine/src/brand.ts` exports `PRODUCT_NAME`, `CLI_BIN`, `CONFIG_FILE`, `OUT_DIR`, `CACHE_DIR`, `ENV_PREFIX`. QA re-exports them from `test/support/product.ts`. The viewer imports `PRODUCT_NAME` at build time. A rename is a one-file change plus the npm package scope.
- **Schema `$id` is brand-free**: `urn:repo-graph:schema:graph:1`. It does not change on rename, so the schema file needs no generation step and graph.json contains no brand string.
- Lint rule forbids string literals equal to the current or former names outside `brand.ts`, docs, and the package manifests.

### Q-27 Perf baseline ownership
- QA owns `perf/baseline.json`. Updates only in a PR labelled `perf-baseline`, with the measured before/after in the description; regressions over the budget need Tech Lead approval, improvements are tightened automatically only by an explicit PR.
- Gate runs on a **pinned runner class** provided by DevOps (to be confirmed by DevOps Engineer; needs fixed cores and no co-tenancy). On shared GitHub-hosted runners perf is **report-only**; any gating there uses a ratio to a calibration workload run in the same job (tolerance 25 percent), never absolute milliseconds.

---

## 2. Draft types for graph.json v1.0.0 (source of truth for the JSON Schema)

Backend writes `packages/engine/schema/graph.v1.schema.json` (2020-12, `$id` above) matching these types; QA may wire the corpus adapter against them now. Property order below is the serialisation order.

```ts
type Provenance = "EXTRACTED" | "INFERRED";
type Pos = { line: number; col: number };          // integers >= 1, UTF-16 units
type Span = { start: Pos; end: Pos };              // end exclusive, start <= end

type Graph = {
  schemaVersion: string;                           // "1.0.0"
  summary: { nodes: number; edges: number; files: number };   // equal array lengths
  coverage: Coverage;
  nodes: Node[];                                   // sorted by id
  edges: Edge[];                                   // sorted (source,type,target,start)
  extensions?: Record<string, unknown>;            // namespaced keys only
};

type Node =
  | { id: string; kind: "directory"; path: string; label: string; extensions?: Ext }
  | { id: string; kind: "file"; path: string; label: string;
      language: string | null;                     // "typescript", "javascript", "python", or null
      lineCount: number | null;                    // null when not read (skipped)
      parse: { status: "parsed" | "partial" | "failed" | "skipped"; reason?: string };
      decoding?: "lossy";
      entryCandidate?: { reason: string; provenance: Provenance };
      extensions?: Ext }
  | { id: string; kind: "symbol"; file: string /* file node id */; label: string;
      symbolKind: string; exported: boolean; span: Span; extensions?: Ext }
  | { id: string; kind: "external"; ecosystem: string; label: string; extensions?: Ext }
  | { id: string; kind: "unresolved"; label: string; reason: string; extensions?: Ext };

type Edge =
  | { source: string; type: "contains"; target: string; provenance: "EXTRACTED"; extensions?: Ext }
  | { source: string; type: "imports" | "reexports"; target: string;
      provenance: "EXTRACTED"; span: Span; specifier: string; extensions?: Ext }
  | { source: string; type: "imports" | "reexports"; target: string;
      provenance: "INFERRED"; confidence: number /* (0,1] */; reason: string;
      span: Span; specifier: string; extensions?: Ext };

type Coverage = {
  files: { discovered: number; parsed: number; partial: number; failed: number; skipped: number; ignored: number };
  byLanguage: { language: string | null; parsed: number; partial: number; failed: number; skipped: number }[]; // sorted
  skipped: { reason: string; count: number }[];    // e.g. symlink, oversize, binary, unsupported-language, unrepresentable-path, id-collision, timeout
  ignored: { rule: string; count: number }[];      // e.g. hard:.git, default:node_modules, gitignore:/dist
  unresolved: { reason: string; count: number }[];
  accounting: { discovered: number; accounted: number };  // must be equal; otherwise engine exits 3
};
```

`path` is the NFC relative POSIX path (root directory node uses `"."`). `label` is the last path segment for files/directories and the qualified name for symbols. Coverage accounting invariant: `discovered = parsed + partial + failed + skipped + ignored`; any silent drop is exit code 3 (QA Q-10 table accepted).

Open details Backend settles inside this shape without changing the contract (propose by PR on this file): exact `symbolKind` vocabulary, exact `reason` enum strings, `entryCandidate.reason` vocabulary.

---

## 3. Provisional rulings on other open questions (owners may challenge)

- Q-10 exit codes `0/1/2/3/4`: accepted as QA proposed.
- Q-12 parse timeout: use the tree-sitter progress/timeout mechanism available in the pinned web-tree-sitter version to cancel a synchronous parse; parsing runs in `worker_threads` workers so a hard `worker.terminate()` is the backstop. A plain `setTimeout` is not acceptable. Timeouts are reported as `skipped: timeout`, never dropped.
- Q-13 cache: content-addressed by file content hash plus adapter version; **read back with `JSON.parse` only** (no `eval`, no `v8.deserialize`, no `require`); entries validated before use; any mismatch means cache miss. Names that are not representable are reported by escaped form (`\u{..}`) in `run.json` only, never in graph.json.
- Q-14: agreed: no reading config outside the root (tsconfig `extends` into packages, global ignore files); report as `unresolved` with reason `config-outside-root`.
- Q-15 Python v1: relative imports, absolute imports from the root and from `src/`, regular packages and namespace packages. Out of v1 (reported `unresolved`, reason `unsupported-resolution`): `sys.path` mutation, `pyproject` package-dir mappings, conditional imports.
- Q-16 `explain` may read snippets from disk only after re-validating the path against the root (SEC-PATH-006) and with the same no-follow open rules as the scanner.
- Q-17: graph.json contains **no source text**: only names, paths, labels, spans, specifiers. Redaction detectors therefore apply to run metadata and `explain` output, not graph.json. Specifier strings are included as written; a specifier that matches a secret detector is replaced by `"[redacted]"` and counted.
- Q-19: viewer must open from `file://`: single-file build (`vite-plugin-singlefile`), no `type=module crossorigin` external scripts. `npx serve` is documented as a fallback, not the plan.
- Q-20: file picker and drag-drop in v1; `?graph=` allowed only with an http(s) origin; parse in a Web Worker; viewer reads `schemaVersion` first and refuses unsupported majors before parsing the rest. Max supported size: 150 MB (matches CT-SIZE-001 placeholder); above it, show a clear error, do not hang.
- Q-21/Q-22: accepted as QA proposed (testids and data attributes; initial render cap 300 nodes, expansion 50 per click, hard cap 1000 visible, 3 s TTI budget on the pinned runner).
- Q-23: viewer persists nothing by default; a CSP meta tag with `connect-src 'none'` is required (no network, PRV-008).
- Q-24: Chromium is the gating browser; Firefox and WebKit run in CI as non-blocking until stable.
- Q-25: separate viewer entry point and build, containing none of the landing/auth/dashboard views and no `/api/*` calls. The SaaS web app stays in `apps/web`, untouched.

## 4. Follow-ups by owner
- Backend: E-01 schema + types + canonical writer + `readGraph`/`validateStrict`; `brand.ts`; lint rule for `child_process`; span fixtures (see Q-4).
- QA: replace `[A-n]` assumptions with these decisions; wire corpus adapter against the types in section 2; update CT-VER-001 (tool version moves to run metadata), CT-SCH-005 (structural edges have no span), CT-INV-002 (edges have no id).
- Frontend: single-file `file://` build, worker loading, MIXED provenance rendering, version-first load.
- DevOps: confirm pinned perf runner class (Q-27).
- Tech Lead: threat model E-10 write-up using Q-7/Q-8; ADR 012 (`knowledge/decisions/012-local-first-engine-pivot.md`).
