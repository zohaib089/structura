# Message codes

From graph.json **1.7.0**, quality factor details, quality tips, hotspot explanations, and duplicate group descriptions may include optional `code` and `params` next to the existing English string (`label`, `text`, `why`, or `description`). Those English fields stay required and unchanged.

`answerGraphQuestion` and the hosted ask API also emit `code` and `params` next to the English `answer`.

- `code` is a dotted name from the list below.
- `params` is an object of string, integer, boolean, or string-array values used to format the message. Keys are sorted. The field is omitted when there are no parameters.

A 1.6.0 or earlier graph omits `code` and `params` so frozen fixtures stay byte-stable.

## Quality factor details

These appear on `quality.project.breakdown[]` and folder breakdown items.

| Code | Params | English when |
| --- | --- | --- |
| `quality.architecture` | `high` (integer, forbidden dependencies), `medium` (integer, undeclared imports) | `high` and `medium` are 0: “No architecture rule breaks”. Otherwise a count of forbidden dependencies and/or undeclared imports. |
| `quality.cycles` | `count` (integer) | `count` is 0: “No import cycles”. Otherwise “N import cycle(s)”. |
| `quality.hotspots` | `count` (integer, files at or above the high-score threshold), `maxCount` (integer, files at score 100) | `count` is 0: “No highly connected hotspots”. Otherwise how many files are heavy hotspots, optionally including how many are at the maximum score. |
| `quality.imports` | `unresolvedPercent` (integer 0–100), `externalPercent` (integer 0–100) | Both meaningful parts empty: “Imports resolve cleanly”. Otherwise the unresolved share and, when it is at least 50%, the third-party share. |
| `quality.size` | `largeFiles` (integer), `largeFunctions` (integer) | Both 0: “No unusually large files or functions”. Otherwise counts of very large files and/or functions. |

## Quality tips

These appear on `tips[]`. `gain` is always the estimated score increase (also written on the tip object itself) and is included in the English “to gain about N points” suffix.

| Code | Params |
| --- | --- |
| `quality.tip.forbidden-import` | `file` (path), `gain` |
| `quality.tip.undeclared-import` | `file` (path), `gain` |
| `quality.tip.cycle` | `files` (string array of paths in the cycle), `gain` |
| `quality.tip.large-file` | `path`, `lines`, `gain` |
| `quality.tip.large-function` | `name`, `path`, `lines`, `gain` |
| `quality.tip.unresolved-imports` | `gain` |
| `quality.tip.hotspot` | `path`, `score`, `gain` |
| `quality.tip.architecture` | `gain` (category-level fix) |
| `quality.tip.cycles` | `gain` (category-level fix) |
| `quality.tip.hotspots` | `gain` (category-level fix) |
| `quality.tip.imports` | `gain` (category-level fix) |
| `quality.tip.size` | `gain` (category-level fix) |

## Hotspot explanations

These appear on `hotspots[].why`.

| Code | Params | English when |
| --- | --- | --- |
| `hotspot.why` | Optional `fanIn`, `fanOut`, `impact`, `findings`, `size` (integers); `sizeKind` (`lines` or `functions`) when `size` is present | A joined sentence of the non-zero signals (“Used by N files”, “imports N files”, “impacts N files”, “has N findings”, “has N functions” or “has N lines”). If every signal is zero: “No hotspot signals”. |

## Duplicate summaries

These appear on `duplicates.groups[].description`.

| Code | Params | English when |
| --- | --- | --- |
| `duplicate.same-file` | `lineCount`, `path`, `times` (occurrence count) | Identical lines appearing two or more times in one file. |
| `duplicate.pair` | `lineCount`, `path`, `otherPath` | Identical lines in exactly two files, one occurrence each. |
| `duplicate.many-files` | `lineCount`, `fileCount` | Identical lines in three or more files, or two files with more than two occurrences in total. |

## Q&A answers

These appear on `answerGraphQuestion` (and `POST .../scans/:scanId/ask`) next to `answer`.

| Code | Params |
| --- | --- |
| `qa.resolve.missing` | `ref` (the name or path that was asked about) |
| `qa.resolve.ambiguous` | `ref`, `listed` (string array of target labels), `extraCount` |
| `qa.impact.need-target` | (none) |
| `qa.impact.no-files` | `target` |
| `qa.impact.none` | `target`, `kind` (`file`, `folder`, or `symbol`); `fileCount` when `kind` is `folder` |
| `qa.impact.dependents` | `target`, `kind`, `dependentCount`, `listed` (paths with depth), `extraCount`; `fileCount` when `kind` is `folder` |
| `qa.explain.need-target` | (none) |
| `qa.explain.file` | `path`, `language`; optional `lineCount`, `docSummary` (the file’s already-sanitised graph `docSummary`, when present), `hotspotScore`, `symbols`, `extraSymbols`, `imports`, `extraImports`, `importers`, `extraImporters`, `findings`, `entry` |
| `qa.explain.folder` | `path`, `fileCount`; optional `languages`, `score`, `grade`, `tip`, `tipGain`, `files`, `extraFiles` |
| `qa.explain.folder-empty` | `path` |
| `qa.explain.symbol` | `name`, `kind`, `path`, `startLine`, `endLine`, `exported`; optional `docSummary` (the symbol’s already-sanitised graph `docSummary`), `fileDocSummary` (the surrounding file’s, when present) |
| `qa.hotspots.none` | (none) |
| `qa.hotspots.list` | `count`, `paths`, `scores` (string array, same order as `paths`), `extraCount` |
| `qa.quality.none` | (none) |
| `qa.quality.score` | `lead`, `score`, `grade`; optional `penalties`, `tips`, `worstFolders` (string arrays) |
| `qa.quality.folder-missing` | `path`, `projectScore`, `projectGrade` |
| `qa.duplicates.none` | (none) |
| `qa.duplicates.list` | `groups`, `duplicatedLines`, `percentage`, `descriptions` (string array), `extraCount` |
| `qa.architecture` | `cycleCount`, `hasConfig` (boolean), `findingCount`; optional `cycles` (string array of folder/file path lists, e.g. `src/a.ts → src/b.ts`), `extraCycles`, `findings` (string array of `file:line (rule: layer → layer)` entries), `extraFindings` |
| `qa.overview` | `fileCount`; optional `languages`, `folders`, `extraFolders`, `entries`, `extraEntries`, `unimported` (files nothing imports, capped at 10), `unimportedCount` (total, may exceed the cap) |
| `qa.fallback.empty` | optional `examples` (suggested questions) |
| `qa.fallback.unknown` | optional `examples` |
