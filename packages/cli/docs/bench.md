# `atlasmith bench`

Compare answers with and without `graph.json` as prompt context. Records token counts and answer-quality scores per arm.

## Quick start (offline)

From the repo root after building the CLI:

```sh
npm run build -w @atlasmith/cli
node packages/cli/dist/bin.js bench \
  --questions packages/cli/fixtures/bench/example-questions.json \
  --graph path/to/graph.json \
  --dry-run \
  --out /tmp/bench-results.json
```

`--dry-run` selects the echo adapter, makes no network calls, and still writes a full results JSON file with token counts and fact-based scores.

## Question set format

Question sets are JSON files with `schemaVersion` `"1.0.0"` and a `questions` array.

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable identifier (unique within the file) |
| `question` | yes | Prompt text sent to the model |
| `reference` | no | Human notes; also passed to the LLM judge when `--llm-judge` is set |
| `expectedFacts` | no | Strings that should appear in the answer (case-insensitive substring match). Omit or leave empty to mark the question unscored for fact coverage. |

See `fixtures/bench/example-questions.json`.

Validation errors include JSON paths, for example `questions[0].expectedFacts[1]: must be a non-empty string`.

## Options

| Flag | Description |
| --- | --- |
| `--questions <path>` | Question set JSON (required) |
| `--graph <path>` | `graph.json` embedded in the with-context arm |
| `--out <path>` | Results file (default: `bench-results.json`) |
| `--dry-run` | Echo adapter only; no network |
| `--adapter ollama\|openai` | Live adapters (ignored when `--dry-run`) |
| `--ollama-url`, `--ollama-model` | Ollama HTTP settings |
| `--openai-url`, `--openai-model` | OpenAI-compatible API settings |
| `--llm-judge` | Also ask the model adapter to grade each answer (off by default) |

Live OpenAI-compatible calls read an API key from `ATLASMITH_BENCH_API_KEY` or `OPENAI_API_KEY`. Keys are never logged.

## Results file

Results use `schemaVersion` `1.1.0`. Each arm includes `quality`:

- `{ "status": "unscored" }` when the question has no `expectedFacts`
- `{ "status": "scored", "score": 0–1, "matched": [...], "missing": [...] }` otherwise

When `--llm-judge` is set, each arm may also include `llmJudge: { "score", "rationale" }` (or `null` if the model response could not be parsed).

`totals.quality` reports `meanScore` (mean over scored questions only) and `scoredCount` per arm, alongside token totals.

Token counts use a lightweight character-based approximation by default (~4 characters per token).
