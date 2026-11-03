# `atlasmith bench`

Compare answers with and without `graph.json` as prompt context. This slice records token counts per arm; answer-quality scoring is reserved for a later task.

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

`--dry-run` selects the echo adapter, makes no network calls, and still writes a full results JSON file with per-question and total token counts.

## Question set format

Question sets are JSON files with `schemaVersion` `"1.0.0"` and a `questions` array.

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable identifier (unique within the file) |
| `question` | yes | Prompt text sent to the model |
| `reference` | no | Notes for future quality scoring (not used yet) |

See `fixtures/bench/example-questions.json`.

Validation errors include JSON paths, for example `questions[0].id: required non-empty string`.

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

Live OpenAI-compatible calls read an API key from `ATLASMITH_BENCH_API_KEY` or `OPENAI_API_KEY`. Keys are never logged.

## Results file

The output JSON includes `schemaVersion`, `dryRun`, `adapter`, per-question `withGraph` / `withoutGraph` arms (prompt, answer, token counts), and `totals`. The `quality` field is always `null` until scoring is implemented.

Token counts use a lightweight character-based approximation by default (~4 characters per token).
