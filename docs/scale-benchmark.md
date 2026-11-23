# Scale benchmark

This records a local, deterministic run of a full engine scan (hotspots 1.2.0, quality 1.3.0, duplicates 1.4.0) plus a fixed set of `answerGraphQuestion` queries against a synthetic TypeScript + Python repository. The generator and runner live in `scripts/scale-benchmark.mjs` and are covered by a 25-file smoke test in `packages/engine` (`src/scale-benchmark.test.ts`).

The synthetic tree is written under `os.tmpdir()`, then deleted when the run finishes. It is multi-folder, with cross-folder imports, a 2-cycle and a 3-cycle, a high fan-in shared module, some large files (~180 extra functions), identical copied helper blocks, and leading doc comments. About 80% of the files are TypeScript and 20% are Python.

No engine code was changed for this measurement. Nothing here ran in Docker.

## Hardware

Measured on 23 Nov 2026 (Europe/Lisbon) on the following machine:

| | |
| --- | --- |
| CPU | Intel Xeon Processor, 8 CPUs |
| Memory | 15.63 GiB RAM, no swap |
| OS | Linux 6.12.113+ x64 |
| Node | v24.22.1 |

Peak RSS is sampled every 50 ms from `process.memoryUsage().rss` inside the benchmark process (parse workers are `worker_threads` in the same process). A process-wide `resource.getrusage(RUSAGE_CHILDREN).ru_maxrss` check of the same Node invocation is listed alongside it. GNU `/usr/bin/time` is not installed on this machine.

## Reproduce

From the repository root, with dependencies installed (`npm ci --ignore-scripts`) and the engine built:

```bash
npm run build -w packages/engine
node scripts/scale-benchmark.mjs --files 2000 --files 5000
```

Each `--files` value is a separate run (generate, scan, Q&A, cleanup). The 25-file smoke test is `npm test -w packages/engine` (see `src/scale-benchmark.test.ts`); do not put the 2,000- or 5,000-file runs in CI.

## Results

### 2,000 files

| Metric | Value |
| --- | --- |
| Generated files | 2,000 (1,600 TypeScript, 400 Python) in 324.6 ms |
| Scan wall time | 2.44 s (engine `elapsedMs` 2.42 s) |
| Peak RSS | 228.8 MiB (rusage 230.4 MiB) |
| `graph.json` size | 6,229,669 bytes (5.9 MiB) |
| Graph | schema 1.4.0, 2,000 files, 7,264 nodes, 12,459 edges |
| Coverage | discovered 2,000, parsed 2,000, partial 0, failed 0, skipped 0 |
| Hotspots | 10 listed; top `src/core/shared.ts` (score 60) |
| Quality | project 69 (grade D), 13 folder scores; lowest listed folder `src` 73 (C) |
| Duplicates | 2 groups, 86 duplicated lines (0%), 2 listed |
| Q&A | 9 questions in 165.7 ms (average 18.4 ms) |

Q&A latency by question:

| Intent | Latency | Question |
| --- | --- | --- |
| overview | 2.4 ms | What languages does this use? |
| overview | 0.8 ms | Where does the app start? |
| hotspots | 0.2 ms | What are the riskiest files? |
| quality | 1.5 ms | How healthy is the project? |
| quality | 0.8 ms | What are the worst folders? |
| duplicates | 0.2 ms | Where is code duplicated? |
| architecture | 11.4 ms | Any circular imports? |
| impact | 143.4 ms | What breaks if I change src/core/shared.ts? |
| explain | 5.0 ms | What does src/index.ts do? |

End-to-end wall time of the Node process (generate + scan + Q&A + cleanup) was 3.083 s.

### 5,000 files

| Metric | Value |
| --- | --- |
| Generated files | 5,000 (4,000 TypeScript, 1,000 Python) in 1.25 s |
| Scan wall time | 5.55 s (engine `elapsedMs` 5.49 s) |
| Peak RSS | 406.6 MiB (rusage 419.9 MiB) |
| `graph.json` size | 12,468,488 bytes (11.9 MiB) |
| Graph | schema 1.4.0, 5,000 files, 13,264 nodes, 26,259 edges |
| Coverage | discovered 5,000, parsed 5,000, partial 0, failed 0, skipped 0 |
| Hotspots | 10 listed; top `src/core/shared.ts` (score 60) |
| Quality | project 69 (grade D), 13 folder scores; lowest listed folder `src` 73 (C) |
| Duplicates | 2 groups, 86 duplicated lines (0%), 2 listed |
| Q&A | 9 questions in 742.0 ms (average 82.4 ms) |

Q&A latency by question:

| Intent | Latency | Question |
| --- | --- | --- |
| overview | 3.0 ms | What languages does this use? |
| overview | 1.2 ms | Where does the app start? |
| hotspots | 0.2 ms | What are the riskiest files? |
| quality | 1.9 ms | How healthy is the project? |
| quality | 1.0 ms | What are the worst folders? |
| duplicates | 0.2 ms | Where is code duplicated? |
| architecture | 22.6 ms | Any circular imports? |
| impact | 703.1 ms | What breaks if I change src/core/shared.ts? |
| explain | 8.6 ms | What does src/index.ts do? |

End-to-end wall time of the Node process was 7.781 s.

## Observations and practical limits

Scaling from 2,000 to 5,000 files (2.5×) took about 2.3× as long to scan and about 1.8× the peak RSS. All 5,000 files parsed with no failures. There was no OOM and no engine change was required (the linear-memory duplicate window hasher already avoids the old suffix-trie blow-up).

Most Q&A answers return in a few milliseconds. The slow case is **impact on a high fan-in file**: `src/core/shared.ts` is imported by almost every TypeScript module, so “What breaks if I change src/core/shared.ts?” took 143 ms at 2,000 files and 703 ms at 5,000 files. That is still sub-second and acceptable for an interactive ask, but it is the number to watch if fan-in grows further.

Recommendations:

- A 5,000-file project of this shape is comfortable on a 16 GiB machine (~420 MiB RSS, ~5.5 s scan). A 4 GiB heap, such as the GitHub-hosted PR-check runner, should also be fine at this size with the current engine.
- If this scaling holds, 10,000 similar files would be on the order of 11 s and under 1 GiB RSS; 20,000 files would still be well under 2 GiB. Treat those as extrapolations, not measured results.
- Re-run this benchmark before tightening CI file caps, and measure impact questions on real high fan-in files rather than only overview/quality queries.
- Keep the heavy 2,000 / 5,000-file runs off CI; the 25-file smoke test is enough to lock the generator and the benchmark wiring.
