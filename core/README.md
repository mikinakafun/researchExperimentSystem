# ResearchPilotSystem — core

**A specification to build a system from, not a description of an existing one.**

This directory is self-contained. Copy it anywhere, hand it to a builder, and it should be enough to construct the system without access to the original repository.

## What it specifies

A between-subjects experiment on **question design in AI-assisted autobiographical recall**. A participant writes one sentence about a past event; the system assigns a hidden question condition (`visual` or `odor`), asks six LLM-generated questions that stay inside it, has an LLM write a short first-person story from the answers — invention permitted — and asks the participant to rate that story.

## Start here

| Order | Open | Why |
|---|---|---|
| 1 | [`overview.html`](overview.html) · [`overview.ja.html`](overview.ja.html) | The whole system on one page, visually. Open either in a browser. |
| 2 | [`01-research/research-context.md`](01-research/research-context.md) | Why this is being studied, and what must **not** be claimed. |
| 3 | [`DESIGN.md`](DESIGN.md) · [`DESIGN.ja.md`](DESIGN.ja.md) | The specification. Same content in both languages. |
| 4 | the numbered directories | Detail, on demand — each one answers a different kind of question. |
| 6 | [`AGENTS.template.md`](AGENTS.template.md) | Before an agent touches anything. Copy it to the new project's root as `AGENTS.md` — how the work is done, and what must not be changed in passing. |

## The directories, by role

Every module lives in the directory named for the question it answers.

| Directory | Answers | Contains |
|---|---|---|
| **`01-research/`** | *Why does this exist? What may we claim?* | [`research-context.md`](01-research/research-context.md) |
| **`02-generation/`** | *How is each question and the story produced, and what makes one unacceptable?* | [`question-strategy.md`](02-generation/question-strategy.md) · [`narrative-generation.md`](02-generation/narrative-generation.md) · [`validation-rules.md`](02-generation/validation-rules.md) · [`fallback-questions.md`](02-generation/fallback-questions.md) · [`contract.md`](02-generation/contract.md) · [`prompts/`](02-generation/prompts/) |
| **`03-measurement/`** | *What is asked of the participant, and how is it analysed?* | [`measures.md`](03-measurement/measures.md) · [`initial-recall-trigger.md`](03-measurement/initial-recall-trigger.md) · [`manipulation-check.md`](03-measurement/manipulation-check.md) |
| **`04-storage/`** | *What is kept, where, and under what consent?* | [`recording-and-storage.md`](04-storage/recording-and-storage.md) · [`consent-form-ja.md`](04-storage/consent-form-ja.md) · [`supabase.md`](04-storage/supabase.md) |
| **`05-verification/`** | *How do we know it works before recruiting anyone?* | [`evaluation-harness.md`](05-verification/evaluation-harness.md) · [`observed-behavior.md`](05-verification/observed-behavior.md) · [`personas.mjs`](05-verification/personas.mjs) · [`evidence/`](05-verification/evidence/README.md) |

`DESIGN.md` and [`AGENTS.template.md`](AGENTS.template.md) sit at the top because they span all five. [`manifest.json`](manifest.json) is the machine-readable index — decisions, modules, preserved assets, what not to trust.

## Three rules for a builder

**1. The architecture is yours.** Framework, language, transport, module layout, UI structure and copy, storage implementation, test framework — all unconstrained. The previous implementation was ~2,500 lines of Next.js; treat it as one solved instance, not a template. What is *not* negotiable is listed in [`DESIGN.md`](DESIGN.md) §4 and visualised in [`overview.html`](overview.html) §8.

**2. Some things are preserved assets — reuse them, do not re-derive them.** The prompt text ([`prompts/`](02-generation/prompts/)), the 18 rating items in both languages ([`measures.md`](03-measurement/measures.md)), the recall trigger ([`initial-recall-trigger.md`](03-measurement/initial-recall-trigger.md)), the fallback question sets ([`fallback-questions.md`](02-generation/fallback-questions.md)), the validator rules ([`validation-rules.md`](02-generation/validation-rules.md)), and the ten personas ([`personas.mjs`](05-verification/personas.mjs)). These were tuned against real model output. Re-writing them silently changes the instrument.

**3. Evidence beats assertion.** [`observed-behavior.md`](05-verification/observed-behavior.md) and [`evidence/`](05-verification/evidence/) record what the previous implementation actually did when driven against a live model, and every non-obvious decision in the spec traces back to it. When the spec and your intuition disagree, check the evidence before overriding.

## Participant-facing text: what is here, what is not

| Screen | Status |
|---|---|
| Recall trigger | **Included**, Japanese — [`03-measurement/initial-recall-trigger.md`](03-measurement/initial-recall-trigger.md) |
| Consent | **Included**, Japanese — [`04-storage/consent-form-ja.md`](04-storage/consent-form-ja.md) |
| Rating items (18) | **Included**, Japanese and English — [`03-measurement/measures.md`](03-measurement/measures.md) |
| Welcome, question screen, narrative screen, debrief | **Not included.** Write them. [`DESIGN.md`](DESIGN.md) §3 states what each must convey. |

**The recall trigger and the consent form are preserved assets, not drafts to replace.** They carry wording that has been deliberated over; the consent form in particular is ethically load-bearing and falls inside the scope of ethics review. Reuse them.

**English versions are generated from the Japanese, not written independently.** Japanese is the source language for participant-facing text; English is a **meaning-matched study version, not a literal translation** — the same policy the 18 rating items already follow. When an English session is needed, generate the English recall trigger and consent form from the Japanese source at that point, keep every stable id unchanged, and treat the result as requiring the same review as the Japanese. Do not let the two drift into separate documents with separate meanings.

## What this directory does not contain

By design, because the builder should produce them:

- **The four screens above** that are marked *not included*.
- **Regular expressions as code.** [`02-generation/validation-rules.md`](02-generation/validation-rules.md) gives every pattern's content and intent in readable form. Implement them in your language, and keep the word-boundary behaviour the notes call out.
- **A test suite.** The behaviours worth pinning are stated throughout as requirements; turn them into tests in whatever framework you use.

## Keep the synthetic harness running

Re-run the harness ([`05-verification/evaluation-harness.md`](05-verification/evaluation-harness.md)) **every time the prompt design changes** — guidance, validator rules, candidate strategy. Standing practice, not a milestone.

It is **not a gate**: passing it is not a precondition for running human participants, and the two proceed in parallel. What it does is catch a change that breaks a condition, and quantify how well each condition can be sustained. Keep measuring per-condition fallback, rejection and neutral-transition counts and report them descriptively — never as an exclusion criterion or a covariate.
