# Quality scores

A scan can attach a project-level quality score and a score for each folder that contains files. Each score is an integer from 0 to 100 with a letter grade and a short, plain-English explanation of what pulled it down. The top three tips say what would raise the score, with an estimated point gain taken from this same formula.

This is computed only from data already in `graph.json`. There is no git history and no later analysis pass.

The engine implementation lives in `packages/engine/src/graph/quality.ts`. Schema: `graph.json` 1.3.0, optional `quality` field.

## Formula

Every score starts at 100. We subtract a penalty for each category, then clamp the result to 0–100:

```
score = clamp(0, 100, 100 − architecture − cycles − hotspots − imports − size)
```

Each category has its own cap, so one kind of problem cannot wipe the whole score.

### Architecture (cap 25)

Architecture findings already on the graph, grouped by severity from the rule that fired:

| Severity | Rules | Penalty |
| --- | --- | --- |
| High | `deny-list` (a forbidden dependency) | 6 points each |
| Medium | `allow-list`, `deny-undeclared`, and any other architecture rule | 3 points each |

### Cycles (cap 20)

File-level import or re-export cycles (strongly connected groups of files). The first cycle costs 8 points; each additional cycle costs 4 points.

### Hotspots (cap 20)

Uses the per-file hotspot scores added in graph.json 1.2.0:

- 3 points for each file with a hotspot score of 80 or more
- 5 extra points for each file that scores 100

### Imports (cap 20)

Of the import and re-export edges that start from files in scope:

```
penalty = min(20, round(50 × unresolvedRatio + 10 × externalRatio))
```

Unresolved (broken) imports weigh more than third-party imports. A project that only uses known packages is not penalised much; missing imports are.

### Size (cap 15)

Thresholds match the later graph heuristics (800-line files, 120-line functions):

| Signal | Penalty |
| --- | --- |
| File of 800–1,599 lines | 4 points |
| File of 1,600 lines or more | 8 points |
| Function or method of 120–239 lines | 3 points |
| Function or method of 240 lines or more | 6 points |

## Letter grades

| Grade | Score |
| --- | --- |
| A | 90–100 |
| B | 80–89 |
| C | 70–79 |
| D | 60–69 |
| F | 0–59 |

## Folder scores

The project score uses every file in the graph. Each folder is scored the same way, but only with the files under that folder (and cycles, findings, imports, and hotspots that involve them). The root folder is not listed separately; it is the project score. Folders are listed worst score first, then by path.

## Tips

Tips are not hand-written estimates. For each plausible fix (break one cycle, fix one finding, split one large file, resolve missing imports, spread work out of a heavy hotspot, or clear a whole category when a cap hides a single-item gain) the engine re-runs the formula and records the score difference. The three highest gains are kept, ties broken by the tip text.
