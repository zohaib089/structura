# Duplicate code detection

A scan can attach an optional `duplicates` section to `graph.json` when the same meaningful block of code appears more than once. Detection is deterministic and runs offline from the source text already read during the scan. There is no AI, no git history, and no extra native or WASM dependency.

The implementation lives in `packages/engine/src/graph/duplicates.ts`. Schema: `graph.json` 1.4.0, optional `duplicates` field. Source text is never written into the graph; only paths, line ranges, counts, and a short description are.

## Thresholds

A block is considered only when it has:

- at least **6 meaningful lines**, and
- at least **48 characters** of normalised text (sum of those line lengths).

Trivial lines are dropped before this count: blank lines, comment-only lines, import/export/require lines, and lines that are only braces, brackets, parentheses, or punctuation.

The listed output is capped at the **20** longest groups (then by occurrence count, then by id). The summary counts every group after sub-span suppression, not just the 20 that are listed.

## Normalisation

Each file is processed with a small, language-aware comment mask that keeps original line numbers:

- TypeScript, JavaScript, and Vue: `//` line comments and `/* ... */` block comments. `#` is not a comment (except a shebang on line 1).
- Python: `#` line comments. `//` is left alone (it is floor division, not a comment).
- Strings (`'`, `"`, `` ` ``, and Python `'''` / `"""`, with the usual prefixes) are left intact so comment markers inside them are not stripped.

After comments are removed, each line is trimmed and internal whitespace is collapsed to a single space. Two copies that differ only in spacing or comments therefore hash to the same block.

## Matching

Each file's meaningful lines are scanned with a sliding 6-line window. The windows are grouped in a hash map (`Map` from the joined normalised text to the positions that share it), which uses memory linear in the number of windows, not a suffix trie.

Buckets with fewer than two hits are dropped. A bucket is first capped at 8 hits per file (earliest start indexes), then at 256 hits overall, taking files in a round-robin so later paths are not dropped. This keeps highly repetitive windows from exploding time or memory, deterministically. Each remaining pair is kept only when it is left-maximal (the previous meaningful lines differ, or one side is at the start of the file), then extended forward while the lines stay equal. Already-covered diagonals of the same pair of files are skipped so overlapping windows of one long match are not re-extended.

Pairs that grow to the same maximal block are merged into one group. Overlapping occurrences in the same file are reduced to the earliest non-overlapping set. A group is dropped when every one of its occurrences sits inside a longer group.

The group `id` is the first 12 hex characters of the SHA-256 digest of the normalised lines joined with `\n`. `lineCount` is the number of meaningful lines. Each occurrence records the repo-relative `path` and the inclusive 1-based `startLine` / `endLine` of the raw span (comments and blanks between the first and last meaningful line are included in the span, not in `lineCount`).

## Output shape

```json
{
  "summary": { "groups": 1, "duplicatedLines": 14, "percentage": 8 },
  "groups": [
    {
      "id": "a1b2c3d4e5f6",
      "lineCount": 6,
      "occurrences": [
        { "path": "src/a.ts", "startLine": 10, "endLine": 16 },
        { "path": "src/b.ts", "startLine": 4, "endLine": 10 }
      ],
      "description": "6 identical lines in src/a.ts and src/b.ts"
    }
  ]
}
```

- `summary.duplicatedLines` is the number of unique `(path, line)` pairs covered by any occurrence span.
- `summary.percentage` is that count divided by the raw line total of the files scanned for duplicates, rounded to an integer 0–100.
- The `duplicates` field is omitted when no groups remain.
