# ResearchPilotSystem — Agent instructions

## Project context

- This is a research mock for a two-condition (Visual / Odor) question-focus experiment. Standard is retired in the specification; the code is still three-condition until the corresponding implementation work lands.
- Read `README.md` for current behavior and commands; read `docs/SPEC.md` for the integrated specification and implementation gaps.
- **The specification is the source of truth.** `docs/SPEC.md` states the requirements and current gaps; git holds when and why they changed. There is no separate decision record that outranks it.
- A boundary that still constrains the work is a rule stated in the present tense in `docs/SPEC.md`. Do not write it up as history; if a rejected option no longer constrains anything, it does not get recorded at all.
- `DEC-xxx` ids appear in frozen reports under `artifacts/` and `core/05-verification/evidence/`, and in a few code comments. The decision records they point to were deleted on 2026-09-08; read them with `git log -p --follow -- core/00-decisions/`. Do not create new DEC numbers.
- Open work lives in GitHub Projects (https://github.com/users/mikinakafun/projects/3), not in the repository.
- `core/` contains the synthetic personas and frozen evidence; `docs/SPEC.md` is the integrated specification for this existing application.
- Runtime prompt text, rating items, participant text, fallback questions and validator rules live with the implementation under `prompts/`, `app/` and `lib/`. The ten personas live at `core/05-verification/personas.mjs`. These are **preserved assets**: reuse them, do not re-derive them.

## Working policy

- Do the work directly in this session. Do not delegate implementation to subagents; architecture, task decomposition, editing, review, integration, and final verification all stay in one place.
- Before editing, decompose the task yourself: name the files you will touch, the specifications that constrain them, and the observable acceptance criteria.
- Work in small, ordered steps and keep each step's change set reviewable. Prefer finishing and verifying one coherent change before starting the next.
- Re-read your own diff against the requirements before reporting completion; do not rely on the fact that you wrote it.
- If a task turns out to be larger than the requested scope, report the needed scope expansion instead of expanding it silently.

## Research and data boundaries

- Do not change experimental conditions, survey meaning, or generation rules outside the requested scope. For prompt work, consult `docs/SPEC.md` and the runtime files under `prompts/`; use git history for older versions and rationale.
- Preserve generation records and existing results; do not invent missing history or silently migrate stored data.
- Use synthetic data for development checks. Keep credentials and private research data out of source control, reports, and unauthorized external transfers.
- Live API calls, persona batches, Supabase operations, and deployment must stay within the user's authorized scope; routine verification is offline.
- Passing software checks does not establish research approval or semantic validity of generated output.

## Verification

- Define observable acceptance criteria before implementation; verify them before reporting completion.
- For code changes, run `npm test && npm run typecheck && npm run build` sequentially after the change is complete.
- Also check affected UI flows with the offline fixture in `README.md`; for database constraints, use `npm run check:result-schema` when its local prerequisites are available.
- Re-run the synthetic harness described in `README.md` **every time the prompt design changes** — guidance, validator rules, candidate strategy. It is standing practice, not a gate; report per-condition fallback, rejection and neutral-transition counts descriptively.
- On failure, inspect the output, repair the cause, and rerun checks. Do not weaken tests or research criteria merely to pass.
- If the same failure persists without new evidence, stop repeating the attempt: revisit the cause, and report external blockers.
- For documentation-only edits, check references and consistency; application tests are unnecessary.
- Report what changed, checks actually performed, and remaining failures or unverified behavior.
- Keep this file concise. Put detailed procedures in existing documentation and address recurring failures with focused regression checks.
