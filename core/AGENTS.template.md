# Agent instructions — template

**Copy this file to the root of the project you build from `core/`, rename it `AGENTS.md`, and delete this section.**

- Every link below is written **relative to the destination** — the new project's root, with this specification vendored at `core/`. The links therefore do not resolve from this file's own location, and if you place the specification elsewhere, change that prefix throughout.
- Three placeholders marked `<…>` are yours to fill: where the application code lives, the offline check chain, and any project-local documents. Everything else is meant to be kept as written.
- The **Working policy** section is a standing constraint; do not weaken it in passing.
- The originating repository keeps its own instantiation at its root `AGENTS.md`. When either changes, change both.

---

# <Project name> — Agent instructions

## Project context

- This is a research mock for a two-condition (Visual / Odor) question-focus experiment. An event-structure arm was retired.
- [`core/DESIGN.md`](core/DESIGN.md) is the specification to build from — not a description of existing code. [`core/README.md`](core/README.md) orients; [`core/overview.html`](core/overview.html) shows the whole system on one page.
- **The specification is the source of truth.** [`core/DESIGN.md`](core/DESIGN.md) and the `core/` modules state what is true now, in the present tense; git holds when and why it changed. No separate decision record outranks them.
- A boundary that still constrains the work is a **rule, stated in the present tense in the spec** — [`core/01-research/research-context.md`](core/01-research/research-context.md) (Design commitments, What is explicitly not claimed) and [`core/03-measurement/measures.md`](core/03-measurement/measures.md) (Standing rules). Do not keep a separate record of rejected options: one that still constrains the work is a rule, and one that does not is noise.
- Prompt text, the 18 rating items, the recall trigger, the fallback question sets, the validator rules and the ten personas are **preserved assets**: reuse them, do not re-derive them. Rewriting them silently changes the instrument.
- `<Where the application code lives, and any project-local documents an agent should read first.>`

## Working policy

- Do the work directly in this session. Do not delegate implementation to subagents; architecture, task decomposition, editing, review, integration, and final verification all stay in one place.
- Before editing, decompose the task yourself: name the files you will touch, the specifications that constrain them, and the observable acceptance criteria.
- Work in small, ordered steps and keep each step's change set reviewable. Prefer finishing and verifying one coherent change before starting the next.
- Re-read your own diff against the requirements before reporting completion; do not rely on the fact that you wrote it.
- If a task turns out to be larger than the requested scope, report the needed scope expansion instead of expanding it silently.

## Research and data boundaries

- Do not change experimental conditions, survey meaning, or generation rules outside the requested scope. For prompt work, consult `core/02-generation/validation-rules.md` and `core/02-generation/narrative-generation.md`.
- Preserve generation records and existing results; do not invent missing history or silently migrate stored data.
- Use synthetic data for development checks. Keep credentials and private research data out of source control, reports, and unauthorized external transfers.
- Live API calls, persona batches, storage operations, and deployment must stay within the user's authorized scope; routine verification is offline.
- Passing software checks does not establish research approval or semantic validity of generated output. The synthetic harness is standing practice, not a gate.

## Verification

- Define observable acceptance criteria before implementation; verify them before reporting completion.
- For code changes, run the project's offline check chain — `<test / typecheck / build commands>` — after the change is complete.
- Also check affected UI flows offline, and the stored-result schema when its local prerequisites are available.
- Re-run the synthetic harness ([`core/05-verification/evaluation-harness.md`](core/05-verification/evaluation-harness.md)) **every time the prompt design changes** — guidance, validator rules, candidate strategy. Report per-condition fallback, rejection and neutral-transition counts descriptively; never as an exclusion criterion or a covariate.
- On failure, inspect the output, repair the cause, and rerun checks. Do not weaken tests or research criteria merely to pass.
- If the same failure persists without new evidence, stop repeating the attempt: revisit the cause, and report external blockers.
- For documentation-only edits, check references and consistency; application tests are unnecessary.
- Report what changed, checks actually performed, and remaining failures or unverified behavior.
- Keep this file concise. Put detailed procedures in existing documentation and address recurring failures with focused regression checks.
