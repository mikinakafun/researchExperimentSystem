# Execution notes

- Date: 2026-09-05 (Asia/Tokyo)
- API server: isolated repository copy, Next.js Webpack mode, `http://127.0.0.1:3001`.
- Model: inherited from the copied `.env.local`: `gpt-4o-mini` (no key or `.env` was copied into artifacts).
- Storage: `RESULT_STORAGE=csv`, with the save CSV located in the isolated copy during execution; the final CSV was copied to this directory afterward. No cloud storage was used.
- Original command shape:
  `BATCH_OUTPUT_DIR=/Users/miramiki/dev/ResearchPilotSystem/artifacts/luna-astra-2026-09-05 BATCH_ID=luna-astra-20260905 RESULT_STORAGE=csv npm run dev -- --port 3001 --webpack`
- Batch command shape:
  `MOCK_BASE_URL=http://127.0.0.1:3001 BATCH_OUTPUT_DIR=/Users/miramiki/dev/ResearchPilotSystem/artifacts/luna-astra-2026-09-05 BATCH_ID=luna-astra-20260905 node --env-file-if-exists=.env.local scripts/run-persona-batch.mjs`
- Execution order: the original runner began `standard` in persona order. During that run, separate workers began `visual` and `odor` concurrently, each with `BATCH_CONDITIONS=visual` or `BATCH_CONDITIONS=odor`; turn order within each session remained 1–6. The raw response timestamps show the first visual save before the final standard saves, so the conditions were not run in strictly successive blocks.
- Three visual sessions were also reached by the original all-condition runner after the visual worker had saved them. Their `/api/save-result` responses were `duplicate=true`; they remain in raw logs and are excluded from the cohort. The first `saved=true, duplicate=false` result per session ID is canonical.
- The stored runner `run-persona-batch-luna.mjs` differs from the repository runner only in worker condition selection, configurable output directory, and raw API-response JSONL logging. Prompts and model settings were unchanged.
- The temporary execution copies were moved out of the repository after completion. The original repository source, `data/`, and `.env.local` were not modified.
