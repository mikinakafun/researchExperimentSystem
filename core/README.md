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

## The directories, by role

Every module lives in the directory named for the question it answers.

| Directory | Answers | Contains |
|---|---|---|
| **`01-research/`** | *Why does this exist? What may we claim?* | [`research-context.md`](01-research/research-context.md) |
| **`02-generation/`** | *How is each question and the story produced, and what makes one unacceptable?* | [`question-strategy.md`](02-generation/question-strategy.md) · [`narrative-generation.md`](02-generation/narrative-generation.md) · [`validation-rules.md`](02-generation/validation-rules.md) · [`fallback-questions.md`](02-generation/fallback-questions.md) · [`contract.md`](02-generation/contract.md) · [`prompts/`](02-generation/prompts/) |
| **`03-measurement/`** | *What is asked of the participant, and how is it analysed?* | [`measures.md`](03-measurement/measures.md) |
| **`04-storage/`** | *What is kept, where, and under what consent?* | [`recording-and-storage.md`](04-storage/recording-and-storage.md) |
| **`05-verification/`** | *How do we know it works before recruiting anyone?* | [`evaluation-harness.md`](05-verification/evaluation-harness.md) · [`observed-behavior.md`](05-verification/observed-behavior.md) · [`evidence/`](05-verification/evidence/) |

`DESIGN.md` sits at the top because it spans all five. [`manifest.json`](manifest.json) is the machine-readable index — decisions, modules, preserved assets, what not to trust.

## Three rules for a builder

**1. The architecture is yours.** Framework, language, transport, module layout, UI structure and copy, storage implementation, test framework — all unconstrained. The previous implementation was ~2,500 lines of Next.js; treat it as one solved instance, not a template. What is *not* negotiable is listed in [`DESIGN.md`](DESIGN.md) §4 and visualised in [`overview.html`](overview.html) §8.

**2. Some things are preserved assets — reuse them, do not re-derive them.** The prompt text ([`prompts/`](02-generation/prompts/)), the 18 rating items in both languages ([`measures.md`](03-measurement/measures.md)), the fallback question sets ([`fallback-questions.md`](02-generation/fallback-questions.md)), and the validator rules ([`validation-rules.md`](02-generation/validation-rules.md)). These were tuned against real model output. Re-writing them silently changes the instrument.

**3. Evidence beats assertion.** [`observed-behavior.md`](05-verification/observed-behavior.md) and [`evidence/`](05-verification/evidence/) record what the previous implementation actually did when driven against a live model, and every non-obvious decision in the spec traces back to it. When the spec and your intuition disagree, check the evidence before overriding.

## What this directory does not contain

By design, because the builder should produce them:

- **UI copy.** Welcome, consent, recall instructions, and debrief text. [`DESIGN.md`](DESIGN.md) §3 states what each screen must convey. Consent and debrief wording is ethically load-bearing — draft it deliberately, and have it reviewed before collecting from a human.
- **Persona fixtures** for the evaluation harness. [`evaluation-harness.md`](05-verification/evaluation-harness.md) specifies what a persona must contain; write them from that.
- **Regular expressions as code.** [`validation-rules.md`](02-generation/validation-rules.md) gives every pattern's content and intent in readable form. Implement them in your language, and keep the word-boundary behaviour the notes call out.
- **A test suite.** The behaviours worth pinning are stated throughout as requirements; turn them into tests in whatever framework you use.

## Before any human participant

Run the synthetic harness ([`evaluation-harness.md`](05-verification/evaluation-harness.md)) and check its per-condition fallback rate against a threshold set **before** the run. This is a go/no-go gate, not a report. It is what would have caught the retired condition's failure before anyone saw it.
