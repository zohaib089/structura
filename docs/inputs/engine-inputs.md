# Binding inputs for the Atlasmith engine (from the Tech Lead, QA and Designer, 2026-10-25)
The original box files are no longer available. This is the Backend Engineer's faithful summary. Commit it to the repo as docs/inputs/engine-inputs.md.

## Brand (owner-confirmed)
packages/engine/src/brand.ts is the ONLY place for: PRODUCT_NAME 'Atlasmith', CLI_BIN 'atlasmith', CONFIG_FILE 'atlasmith.yml', graph file 'graph.json', slug 'atlasmith', OUT_DIR/CACHE_DIR derived from the slug ('.atlasmith'), ENV_PREFIX 'ATLASMITH_'. Lint forbids the literals 'structura'/'atlasmith' outside brand.ts, docs and manifests. The schema $id is brand-free: urn:repo-graph:schema:graph:1.

## graph.json v1.0.0 contract (Tech Lead, DECIDED)
- Deterministic, closed, brand-free, source-text-free. NO tool version, timestamps, durations, git SHA, hostnames, absolute paths or brand. Run metadata goes to run.json next to the output (`--meta <path>`, `--no-meta`) and to `--json` stdout.
- schemaVersion is a semver string "1.0.0". readGraph: a greater major is refused with typed error GraphVersionUnsupported (CLI exit 2). The same major with a higher minor is accepted, with unknown props stripped and unknown kind/type kept as generic. validateStrict uses Ajv strict and is closed. Invalid graph means the whole load fails, with the first 20 JSON-pointer errors. Semantic checks (dangling endpoints, duplicate ids, count mismatches, span bounds, contains cycles) are part of load. The reader rejects __proto__/constructor/prototype keys and depth > 64.
- additionalProperties false everywhere. The only escape hatch is an optional `extensions` object (top, node, edge) with keys ^[a-z][a-z0-9-]*:[A-Za-z0-9._-]+$. There are no data-dependent object keys: maps are arrays of objects.
- Spans: {start:{line,col}, end:{line,col}}, line and col 1-based, in UTF-16 code units, end exclusive. Only \n is a line break (\r\n = one break; a lone \r is not a break). A leading BOM is stripped and not counted. Invalid UTF-8 is decoded with U+FFFD and the file node gets decoding:"lossy". Conversion is line=row+1, col=utf16Column+1. You MUST prove what web-tree-sitter reports for column, using fixtures (astral emoji, CJK, combining marks, CRLF, BOM, lone CR). lineCount = count of \n + 1.
- Ids (no hashes): dir:<relpath> (root dir:.), file:<relpath>, sym:<file relpath>#<Qualified.name> (dupes ~2,~3; #default; #<anonymous:N>), ext:<ecosystem>:<package root> (ext:npm:@scope/pkg, ext:pypi:os for os.path), unresolved:<importer relpath>::<specifier>. relpath is POSIX, NFC, no ./.. segments, no backslash or control chars. An unrepresentable path is skipped with reason `unrepresentable-path`; an NFC collision is skipped with reason `id-collision`.
- Edges have no id. The uniqueness key is (source,type,target,span.start.line,span.start.col); for contains it is (source,type,target). Ordering: nodes by id, edges by that key, UTF-16 code-unit order (never localeCompare). If a static and a type-only import of the same target could share a start position, raise it with the Tech Lead before changing the key (note it in the PR).
- Node kinds: directory, file, symbol, external, unresolved. Edge types: contains, imports, reexports. There is no `defines` edge (use contains). contains edges are EXTRACTED and have NO span. imports/reexports edges REQUIRE span and specifier. INFERRED edges require confidence in (0,1] plus reason; EXTRACTED edges forbid both (if/then in the schema).
- Approved additions: on imports/reexports edges only, optional `importKind` ("static"|"dynamic"|"require", default static) and `typeOnly` (boolean, default false), written only when non-default. A type-only re-export is reexports + typeOnly. A non-literal import() becomes an `unresolved` node with reason non-literal-specifier (not an EXTRACTED edge).
- Types (property order = serialisation order):
  Graph = { schemaVersion, summary:{nodes,edges,files}, coverage, nodes, edges, extensions? }
  file node = { id, kind:"file", path, label, language (typescript|javascript|python|null), lineCount|null, parse:{status: parsed|partial|failed|skipped, reason?}, decoding?, entryCandidate?:{reason, provenance}, extensions? }
  symbol node = { id, kind:"symbol", file, label, symbolKind, exported, span }
  external node = { id, kind:"external", ecosystem, label }; unresolved node = { id, kind:"unresolved", label, reason }; directory node = { id, kind:"directory", path, label }
  Coverage = { files:{discovered,parsed,partial,failed,skipped,ignored}, byLanguage:[{language,parsed,partial,failed,skipped}], skipped:[{reason,count}], ignored:[{rule,count}], unresolved:[{reason,count}], accounting:{discovered,accounted} }. Invariant: discovered = parsed+partial+failed+skipped+ignored. Breaking it (a silent drop) means exit 3.
- Canonical serialisation: UTF-8 without BOM, 2-space indent, fixed property order, \n line endings, a single trailing \n. An incremental rescan must equal a clean scan byte for byte (fall back to a full rescan when that can't be guaranteed).
- Frozen canary schema-fixtures/v1.0.0.graph.json and schema/SCHEMA_HASH.
- Backend settles and documents (packages/engine/docs/graph-json-v1.md) the symbolKind vocabulary, the reason enums and the entryCandidate.reason vocabulary. Multiple entry candidates are allowed.

## Ignores
Hard excludes (never overridable): the out dir, the cache dir, .git, and anything outside the root; counted as `hard:<name>`. Default ignores (node_modules, build dirs, venvs, __pycache__, and the repo .gitignore including nested files, parsed in-process) can be overridden by --include <glob>. Global git config and core.excludesFile are never read. Every matching rule is reported as {rule,count} (default:node_modules, gitignore:/dist, hard:.git). Non-ignored files always get a file node.

## Security (threat model E-10 rulings)
- No child_process/cluster anywhere in engine/cli (lint no-restricted-imports plus a CI grep test). No network, no telemetry. Never execute repo code. Add a test tripwire that traps child_process AND network APIs during a scan.
- Symlinks are never followed; they are counted as skipped:symlink. The root is realpath'd once. Reads use O_NOFOLLOW and then fstat: the target must be a regular file whose (dev,ino) equals the earlier lstat. Per directory, check that realpath is inside the root. The intermediate-component swap is an accepted residual risk.
- The default cache lives OUTSIDE the scan root (OS user cache dir keyed by the root realpath). An in-root cache is read only with explicit --cache-dir. The cache is content-addressed (content hash + adapter version), read with JSON.parse only, and validated; any mismatch is a miss.
- No --open flag in v1. Never write outside --out, and refuse to overwrite non-graph files.
- Repo-controlled config may only LOWER limits, never override hard excludes. No config is read outside the root (tsconfig extends into packages is reported as unresolved, reason config-outside-root).
- Parse timeout: use tree-sitter's progress/cancel mechanism, parse in worker_threads, with worker.terminate() as the backstop. A timeout is reported as skipped:timeout. WASM memory is outside the V8 heap, so recycle workers.
- One constants module (packages/engine/src/limits.ts) with proposed defaults: 1 MiB max file size, 5 s parse timeout, 250k files, depth 256. Report measured baseline numbers from real runs so the Tech Lead can confirm.
- graph.json has no source text. Specifiers matching a secret detector become "[redacted]" and are counted. Redaction otherwise applies to run.json and explain output.

## CLI exit codes (QA plus Tech Lead)
0 ok, 1 runtime error, 2 usage error or unsupported graph version, 3 silent drop (accounting failure, never overridable), 4 --strict coverage failure, 130 interrupted.

## Resolution rules (settled with QA)
- tsconfig paths/baseUrl aliases are EXTRACTED. A .js/.jsx/.mjs/.cjs specifier resolving to .ts/.tsx/.mts/.cts is EXTRACTED. Use a real JSONC parser: "zustand/*" inside a string must not be read as a comment. Comments, JSDoc @example blocks and commented-out code never create edges (AST only).
- An unresolvable tsconfig extends (e.g. an uninstalled @sindresorhus/tsconfig) does not fail the scan; it goes in coverage.unresolved with reason config-extends-unresolved, or config-outside-root when the path leaves the root.
- Python: imports rooted at the scan root are EXTRACTED. Absolute first-party imports found via src/ discovery are INFERRED (reason src-root-guess). `from . import <submodule>` is INFERRED (reason submodule-heuristic). TYPE_CHECKING imports get typeOnly. The stdlib list is a fixed CPython 3.14 list pinned in packages/engine/data (never the host Python). Externals use package roots.
- In v1 scope: dotted `import a.b.c`, namespace packages, .pyi (python; prefer .py), baseUrl/paths, package.json workspaces names, .mts/.cts/.mjs/.cjs, static/re-export/type-only/dynamic-literal/require.
- Out of v1 (report as unresolved with reason unsupported-resolution, never dropped): tsconfig project references, package.json `imports` (#) and `exports` self-reference, sys.path mutation, pyproject package-dir, conditional imports.
- QA's golden corpus (zustand, consola, requests, attrs 26.1.0, ky v2.2.0) is maintained by the QA agent; the scanner must work with those repos' layouts.
