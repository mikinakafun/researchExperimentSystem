# ResearchPilotSystem — Agent instructions

## Project context

- This is a research mock for a two-condition (Visual / Odor) question-focus experiment. Standard was retired (DEC-041); the code is still three-condition until TASK-023 lands.
- Read `README.md` for current behavior and commands; use `docs/MASTER.md` to find task-relevant specifications.
- Decisions that constrain the system live in `core/00-decisions/decisions.md`; project-management decisions in `docs/project/decisions-active.md`; the index of every DEC is `core/00-decisions/README.md`. Superseded ones are in `core/00-decisions/decisions-archive.md`. Check the `状態` / `承認` fields and superseding entries; report conflicts rather than silently resolving them. Each DEC names its 反映先 — when a `core/` module disagrees with a decision, the decision wins and the module is what gets fixed.
- Open work belongs in `core/00-decisions/tasks.md`. Do not add work items to the decision files, and do not add decisions to `tasks.md`. Do not introduce a new judgement inside a spec file; record it as a DEC first.
- `core/` is a self-contained rebuild specification (`core/DESIGN.md`); `docs/protocol/PROTOCOL.md` is retired.

## Coding subagent policy

- Prefer GPT-5.6 Luna (`gpt-5.6-luna`) for bounded implementation tasks that can proceed independently alongside useful parent work.
- The parent owns architecture, design, task decomposition, file ownership, review, integration, and final verification.
- Delegate isolated features, components, utilities, tests, scoped bug fixes, repetitive edits, and local refactoring.
- Handle trivial or tightly coupled changes directly when delegation adds unnecessary coordination. If Luna is unavailable, report it and continue directly.
- Give each subagent a concrete task, allowed files or directory, relevant specifications, and observable acceptance criteria.
- Keep concurrent write sets disjoint, including the parent's edits and test files. Subagents must report needed scope expansions before making them.
- Require changed files, verification performed, results, and unresolved issues in each subagent's report.
- Review every subagent diff against the requirements and run final checks on the integrated code; do not rely solely on completion reports.

## Research and data boundaries

- Do not change experimental conditions, survey meaning, or generation rules outside the requested scope. For prompt work, consult DEC-035, DEC-036, and later superseding decisions.
- Preserve generation records and existing results; do not invent missing history or silently migrate stored data.
- Use synthetic data for development checks. Keep credentials and private research data out of source control, reports, and unauthorized external transfers.
- Live API calls, persona batches, Supabase operations, and deployment must stay within the user's authorized scope; routine verification is offline.
- Passing software checks does not establish research approval or semantic validity of generated output.

## Verification

- Define observable acceptance criteria before implementation, including work done directly by the parent; verify them before reporting completion.
- For code changes, run `npm test && npm run typecheck && npm run build` sequentially after integration.
- Also check affected UI flows with the offline fixture in `README.md`; for database constraints, use `npm run check:result-schema` when its local prerequisites are available.
- On failure, inspect the output, repair the cause, and rerun checks. Do not weaken tests or research criteria merely to pass.
- If the same failure persists without new evidence, stop repeating the attempt: revisit the cause or have the parent take over from the subagent; report external blockers.
- For documentation-only edits, check references and consistency; application tests are unnecessary.
- Report what changed, checks actually performed, and remaining failures or unverified behavior.
- Keep this file concise. Put detailed procedures in existing documentation and address recurring failures with focused regression checks.
