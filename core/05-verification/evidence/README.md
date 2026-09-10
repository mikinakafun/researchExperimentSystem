# Evidence — runs on record

Every live or offline run that a decision cites. Each directory is a frozen copy of the working record in `artifacts/` (JSON there is git-ignored; here it is tracked). Nothing in this directory is a specification; it is what the previous implementation actually did under a named configuration.

| Directory | Date | Prompt versions | What ran | Headline |
|---|---|---|---|---|
| [`prompt-eval-2026-07-25/`](prompt-eval-2026-07-25/report.md) | 2026-07-25 | questions v0.3.0 | 10 personas × 3 conditions (standard / non-odor / odor-based), 180 questions, 30 narratives, `gpt-4o-mini-2024-07-18` 0.55/0.75; independent LLM judge `gpt-5.5-2026-04-23` | Generation healthy (fallback 2/60, 1/60, 3/60) but the runtime validator passed 9/60 standard questions that the judge classed as sensory/emotion — the origin of DEC-033/034 |
| [`validation-v042-2026-09-02/`](validation-v042-2026-09-02/report.md) | 2026-09-02 | questions v0.4.2 | Offline tests + live smoke 3 conditions × 2 questions | 6/6 generated on first attempt. Two misses found during implementation (standard emotion question, odor 「どのような花から」) became regression tests — the source of the original odor source-inference rule, later narrowed by DEC-049 |
| [`validation-v043-2026-09-02/`](validation-v043-2026-09-02/report.md) | 2026-09-02 | narrative v0.4.3 | Offline only (14 tests) | Structural narrative rules verified; no live generation |
| [`luna-astra-2026-09-05/`](luna-astra-2026-09-05/report.md) | 2026-09-05 | questions v0.4.2, narrative v0.4.3 | 10 personas × 3 conditions, 180 questions, 30 narratives, compared against the 2026-07-25 batch | Narratives 35% shorter than the old version; fallback standard 7/60, visual 0/60, odor 7/60; Astra read all 30 narratives and found under-reported creative additions in 4/1/6 of 10 |
| [`validation-v044-live-2026-09-06/`](validation-v044-live-2026-09-06/report.md) | 2026-09-06 | questions v0.4.4, narrative v0.4.3 | 3 synthetic scenarios (concrete recall / partial recall / persistent non-recall) × 3 conditions × 6 turns = 54 questions, 9 narratives | Fallback standard 6/18, **visual 0/18, odor 1/18**. The odor fallback and the odor retry are the two non-lexical failure modes on record — see `../observed-behavior.md` |
| [`live-run-2026-09-07.json`](live-run-2026-09-07.json) | 2026-09-07 | questions v0.4.4, narrative v0.4.3 | 4 conversations (ja standard / visual / odor, en visual), 24 questions, 2 narratives, 5 malformed probes — script [`live-probe.mjs`](live-probe.mjs) | All 6 rejections and both fallbacks in `standard`; visual and odor 0 rejections in 18 turns. Basis of DEC-041 |

Related assets: `../personas.mjs` (the 10 personas used by the harness and by the 2026-07-25 and 2026-09-05 batches), `validation-v044-live-2026-09-06/run-live-validation.mjs` (the three-scenario synthetic answerer).

## Configuration behind the current numbers

The most recent numbers (2026-09-06 and 2026-09-07 runs) came from this configuration. It is recorded here so that any later number can be compared against it; it is not a fixed value (DEC-043).

| | |
|---|---|
| model | `gpt-4o-mini-2024-07-18` (Responses API, `store: false`, strict `json_schema`) |
| question temperature / attempts | 0.55 / 3 sequential, flag names fed back on retry |
| narrative temperature / attempts / ceiling | 0.75 / 3 / 10 sentences |
| turns | 6 |
| prompt versions | `prompt-catalog-v0.4.4-mock-draft` (questions), `prompt-catalog-v0.4.3-mock-draft` (narrative) |
| conditions run | standard, visual, odor (standard since retired) |
| validator | the rules in `../../02-generation/validation-rules.md` before DEC-049 narrowed the odor source-inference pattern |
