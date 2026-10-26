# graph.json v1

`graph.json` is the deterministic, closed, brand-free, source-text-free output of a scan.
Run metadata (time, tool version, absolute paths, memory) goes to `run.json` and to `--json` stdout, never into this file.

- Schema id: `urn:repo-graph:schema:graph:1` (brand-free).
- `schemaVersion`: semver string `1.0.0`. A greater major is refused (`GraphVersionUnsupported`, CLI exit 2). The same major with a higher minor is accepted: unknown properties are stripped, unknown kind/type values are kept as generic nodes or edges.
- UTF-8 without a BOM, 2-space indent, `\n` line endings, exactly one trailing `\n`.
- Property order is the order in this document. Nodes are sorted by `id`. Edges are sorted by `(source, type, target, span.start.line, span.start.col)` in UTF-16 code-unit order (`contains` edges have no span and sort as line 0, column 0). `localeCompare` is never used.
- `additionalProperties` is false everywhere. The only open object is optional `extensions`, whose keys match `^[a-z][a-z0-9-]*:[A-Za-z0-9._-]+$`.
- Maps are arrays of objects. There are no data-dependent object keys.
- The reader rejects `__proto__`, `constructor` and `prototype` keys, and nesting deeper than 64. Invalid documents fail as a whole. The first 20 problems are reported as JSON pointers.

## Document

```json
{
  "schemaVersion": "1.0.0",
  "summary": { "nodes": 4, "edges": 3, "files": 1 },
  "coverage": {
    "files": { "discovered": 1, "parsed": 1, "partial": 0, "failed": 0, "skipped": 0, "ignored": 0 },
    "byLanguage": [{ "language": "typescript", "parsed": 1, "partial": 0, "failed": 0, "skipped": 0 }],
    "skipped": [],
    "ignored": [],
    "unresolved": [{ "reason": "not-found", "count": 1 }],
    "accounting": { "discovered": 1, "accounted": 1 }
  },
  "nodes": [
    { "id": "dir:.", "kind": "directory", "path": ".", "label": "." },
    { "id": "file:app.ts", "kind": "file", "path": "app.ts", "label": "app.ts", "language": "typescript", "lineCount": 1, "parse": { "status": "parsed" } },
    { "id": "sym:app.ts#main", "kind": "symbol", "file": "file:app.ts", "label": "main", "symbolKind": "function", "exported": true, "span": { "start": { "line": 1, "col": 1 }, "end": { "line": 1, "col": 20 } } },
    { "id": "unresolved:app.ts::missing", "kind": "unresolved", "label": "missing", "reason": "not-found" }
  ],
  "edges": [
    { "source": "dir:.", "type": "contains", "target": "file:app.ts", "provenance": "EXTRACTED" },
    { "source": "file:app.ts", "type": "contains", "target": "sym:app.ts#main", "provenance": "EXTRACTED" },
    { "source": "file:app.ts", "type": "imports", "target": "unresolved:app.ts::missing", "provenance": "EXTRACTED", "span": { "start": { "line": 1, "col": 25 }, "end": { "line": 1, "col": 42 } }, "specifier": "missing" }
  ]
}
```

`summary.files` counts file nodes. `summary.nodes` and `summary.edges` count the arrays.

## Spans

`{ "start": { "line", "col" }, "end": { "line", "col" } }`. Line and column are 1-based. Column counts UTF-16 code units. `end` is exclusive.

`web-tree-sitter` 0.27 reports `startPosition.column` and `startIndex` in UTF-16 code units (the same index `String.prototype` uses), not UTF-8 bytes and not Unicode code points. The conversion into a graph span is `line = row + 1`, `col = column + 1`, applied after a leading BOM has been stripped. Fixtures under `schema-fixtures/spans/` lock this:

- an emoji (two UTF-16 code units, four UTF-8 bytes) advances the column by two;
- a CJK ideograph advances it by one;
- a combining mark advances it by one code unit of its own;
- a ZWJ family emoji advances it by the UTF-16 length, not the code-point length;
- `\r\n` is one line break;
- a lone `\r` is not a line break;
- a leading BOM is not counted once the decoder has stripped it. The raw parser does count a BOM that is left in the string, which is why the decoder strips it first.

`lineCount` is the number of `\n` bytes plus one, after the BOM strip. It is null when the file was not decoded. Invalid UTF-8 is decoded with U+FFFD and the file node gets `"decoding": "lossy"`.

## Identifiers

No hashes.

| Node | Id |
| --- | --- |
| directory | `dir:<relpath>` (root is `dir:.`) |
| file | `file:<relpath>` |
| symbol | `sym:<file relpath>#<Qualified.name>` |
| external | `ext:<ecosystem>:<package root>` (`ext:npm:@scope/pkg`, `ext:node:fs`, `ext:pypi:os`) |
| unresolved | `unresolved:<importer relpath>::<specifier>` |

`relpath` is POSIX, NFC, with no `.` or `..` segments and no backslash or control characters. A path that cannot be represented is skipped with reason `unrepresentable-path`. A second path that normalises to the same id is skipped with reason `id-collision`.

Symbol duplicates of the same qualified name in one file are `~2`, `~3`, … The first keeps the plain id. The default export uses `#default`. A symbol with no name uses `#<anonymous:N>`.

External names are package roots: `lodash/fp` is `lodash`, `fs/promises` and `node:fs` are `fs`.

## Nodes

Kinds: `directory`, `file`, `symbol`, `external`, `unresolved`.

- directory: `id`, `kind`, `path`, `label` (last segment, `.` for the root).
- file: `id`, `kind`, `path`, `label`, `language`, `lineCount`, `parse`, optional `decoding`, optional `entryCandidate`.
- symbol: `id`, `kind`, `file`, `label`, `symbolKind`, `exported`, `span`.
- external: `id`, `kind`, `ecosystem`, `label`.
- unresolved: `id`, `kind`, `label`, `reason`.

`language` is `typescript`, `javascript`, `python`, or `null`.

`parse.status` is `parsed`, `partial`, `failed`, or `skipped`. `parsed` has no reason. The other statuses require one.

### symbolKind

`class`, `default`, `enum`, `function`, `interface`, `namespace`, `type`, `unknown`, `variable`.

### parse reasons

Skipped (`parse.status: skipped`, and the same strings in `coverage.skipped`):

`binary`, `id-collision`, `locked`, `max-depth`, `not-regular-file`, `path-too-long`, `sensitive-file`, `symlink`, `symlink-outside-root`, `timeout`, `too-large`, `unrepresentable-path`, `unsupported-language`.

Failed:

`changed-during-scan`, `parser-error`, `permission-denied`, `read-error`, `vanished`.

Partial:

`name-too-long`, `syntax-errors`, `too-many-edges`, `too-many-symbols`.

### unresolved reasons

`config-extends-unresolved`, `config-outside-root`, `non-literal-specifier`, `not-found`, `outside-root`, `target-ignored`, `unsupported-resolution`, `unsupported-specifier`.

`config-extends-unresolved` and `config-outside-root` are configuration problems. They appear in `coverage.unresolved` and do not create edges. `unsupported-resolution` is used for out-of-v1 features (`package.json` `imports`, self-`exports`) and may therefore exceed the number of edges. Project references are followed for config discovery; they are not `unsupported-resolution`.

A non-literal `import()` or `require()` is an **EXTRACTED** edge. The import site is a fact, so the edge has no `confidence` and no `reason`. `importKind` is `dynamic` for `import()` and `require` for `require()`. `specifier` is the marker `<non-literal>` (not source text). The edge targets an unresolved node with reason `non-literal-specifier`.

### entryCandidate.reason

`conventional-name`, `package-bin`, `package-exports`, `package-main`, `package-script`.

Several files may be entry candidates. The schema stores one `entryCandidate` per file. When one file matches more than one reason, the highest precedence wins:

1. `package-exports` (`EXTRACTED`)
2. `package-main` (`EXTRACTED`)
3. `package-bin` (`EXTRACTED`)
4. `package-script` (`INFERRED`)
5. `conventional-name` (`INFERRED`)

### INFERRED edge reasons

`build-output-mapping`, `conventional-entry`, `dynamic-pattern`, `src-root-guess`, `src-subpath`, `submodule-heuristic`.

`src-root-guess` and `submodule-heuristic` belong to the Python adapter (a later task). They are in the vocabulary so that adapter can emit them without a schema change. `dynamic-pattern` stays in the vocabulary. A non-literal import does not use it; that edge is `EXTRACTED`.

## Edges

Types: `contains`, `imports`, `reexports`. There is no `defines` edge; containment is `contains`.

Edges have no id. The uniqueness key is `(source, type, target, span.start.line, span.start.col)`. For `contains` the key is `(source, type, target)`.

`contains` is always `EXTRACTED` and has **no span**. It links a directory to its child directory or file, and a file or symbol to a symbol declared in that file.

`imports` and `reexports` require `span` and `specifier`. They start at a file and end at a file, an external, or an unresolved node.

- `EXTRACTED` forbids `confidence` and `reason` (schema `if`/`then`, and a separate closed shape).
- `INFERRED` requires `confidence` in `(0, 1]` and a `reason`.

On `imports` and `reexports` only:

- `importKind`: `static` (default, omitted), `dynamic`, or `require`. Written only when it is not `static`.
- `typeOnly`: written only when `true`. Value wins: `typeOnly` is true only when every binding on that import site is type-only. A mixed site such as `import { type A, A } from './mod'` is one edge with `typeOnly` omitted. A type-only re-export is `reexports` plus `typeOnly: true`.

### Edge-key collision

The key does not include `importKind` or `typeOnly`, and the key is unchanged. A static import and a type-only import of the same target that start at the same position collapse to one edge (the first one kept). The TypeScript/JavaScript adapter emits a single edge for a mixed statement, and value wins, so that statement does not collide with itself. `run.json` records `collapsedEdges` when a scan drops one.

## Coverage

```text
discovered = parsed + partial + failed + skipped + ignored
```

`accounting.discovered` equals `files.discovered` and `accounting.accounted`. Breaking the invariant is a silent drop: the engine throws and the CLI exits 3. The exit code is not overridable.

`byLanguage` rows are sorted by language with `null` (reported as other languages) first. `skipped`, `ignored` and `unresolved` are sorted by their key. `skipped` counts every skipped **and** failed file, including entries that have no node (`unrepresentable-path`, `id-collision`, `max-depth`). Its counts sum to `files.skipped + files.failed`. `ignored` counts sum to `files.ignored`. Rules look like `default:node_modules`, `gitignore:/dist`, `hard:.git`.

`files.parsed` / `partial` match the file nodes exactly. `files.skipped` and `files.failed` are greater than or equal to the file nodes in that status, because some skipped entries have no node.

## What v1 resolves

Extracted: tsconfig `paths` and `baseUrl` (a real JSONC parse, so `zustand/*` inside a string is not a comment), a `.js`/`.jsx`/`.mjs`/`.cjs` specifier that lands on `.ts`/`.tsx`/`.mts`/`.cts`, package.json `workspaces` names, relative files, `node:` and Node built-ins, literal `import()`, `require()`, non-literal `import()` and `require()` (specifier `<non-literal>`), static imports, re-exports, and type-only imports.

Config discovery reads `tsconfig.json` and `jsconfig.json`, then follows `extends` and `references` to any other in-root file (for example `tsconfig.app.json`). `paths` and `baseUrl` found that way are extracted. A bare package `extends` such as `@vue/tsconfig/...` is `config-extends-unresolved`. A target that leaves the root is `config-outside-root`.

Inferred: a `dist`/`build`/`lib`/`out` entry mapped back to `src`, a conventional `src/index`, and a `src/` subpath of a workspace package.

Reported unresolved, never dropped: package `imports` (`#`) and self-`exports`, an `extends` or `references` target that leaves the root or cannot be read (node_modules is not read), non-literal specifiers.

Comments, JSDoc `@example` blocks and commented-out code never create edges. Only the syntax tree does.

## Strict mode

`--strict` exits 4 after writing the graph when the default thresholds fail. Those defaults fail only on failed files (`maxFailed` 0) and timeouts (`maxTimeout` 0). Partial files and unresolved imports are reported and do not fail the default thresholds (`maxPartial` and `maxUnresolved` are unbounded). The thresholds live in `packages/engine/src/report/strict.ts`.

`run.json` may be written outside `--out` with `--meta`. That path uses the same output safety as `graph.json`: a symlink is never followed, and an existing file is overwritten only when its JSON shape is a previous run (`command` `"scan"` plus the run counters). Any other file is refused.
