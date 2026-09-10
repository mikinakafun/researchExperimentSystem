# ResearchPilotSystem — Rebuild Specification

**This is a specification to build from, not a description of the existing code.** It states what the system must do and why, at the level that was actually decided. Everything below the decision level — framework, language, file layout, module boundaries, transport, how storage is implemented — is **yours to design**. Do not reproduce the current architecture.

Two things are inherited verbatim because they were settled and work: **the two storage modes with their consent lock** (§8) and **the operating commands** (§9).

This text is the specification. It states what is true now; git holds when and why it changed. `DEC-xxx` ids in older reports refer to decision records deleted on 2026-09-08 — read them with `git log -p --follow -- core/00-decisions/`.

Concrete assets that must not be re-derived from scratch — prompt text, rating items, validator rules, fallback questions — are preserved in the linked modules (§11). Use them.

**New here?** Start with [`overview.html`](overview.html) (日本語: [`overview.ja.html`](overview.ja.html)) for the diagrams, and [`research-context.md`](01-research/research-context.md) for why any of this is being studied.

*(日本語版: [`DESIGN.ja.md`](DESIGN.ja.md) — 内容は同一。)*

---

## 1. What is being measured

A **between-subjects experiment on question focus in AI-assisted autobiographical recall.**

A participant writes one sentence about a past personal event. The system assigns a question condition, asks **six LLM-generated follow-up questions** that stay inside that condition, then gives the fragment and all six answers to an LLM that **writes a short first-person story, with invention explicitly permitted**. The participant rates that story, then answers checks.

The independent variable is **where the questions point attention**. There is no odor stimulus — the manipulation lives entirely in the wording of the questions.

**Primary outcome:** 記憶様感 / perceived memory-likeness (mean of its three items).
**Primary comparison:** Odor vs Visual.

The generated story is not a reconstruction of the participant's memory. Every screen that shows it must say so.

---

## 2. Two conditions

| Condition | Points attention at | Must not ask about |
|---|---|---|
| `visual` | visual objects and details | odor, sound, touch, temperature, body, emotion |
| `odor` | odor and its qualities, including what it was an odor of | vision, sound, touch, temperature, body, emotion, **explaining or guessing at a cause** |

Assignment is made **after** a valid fragment is submitted, by **block randomisation stratified by session language**, and every assignment is written to an allocation log. Block size, allocation ratio, seed handling and concealment are still open (TASK-016); plain `Math.random()` is not the final mechanism. The condition name is never shown until debriefing.

`odor` carries one prohibition `visual` does not: the question may not ask the participant to explain a cause or to guess at a source they cannot recall. It may ask what a remembered smell was a smell of. Olfactory perception is object-based — the source label is the percept rather than an inference about it, and in Japanese there is little other vocabulary for describing a smell — so forbidding that would leave `odor` unable to ask for object identity while `visual` asks for it freely, an asymmetry inside the only contrast this design has.

### Why `standard` was removed

A third arm — event structure, actions, people, sequence — existed and has been **retired**. The reasons, in order:

1. It carried **zero weight in the primary comparison.** The analysis plan gave it coefficient 0; the primary contrast was always Odor − Visual.
2. It was the only condition defined **purely by exclusion** (no sensory, no emotion, no atmosphere). In a live run it produced **every rejection observed** (6 of 6) and fell back to a canned question on **2 of 6 turns**, while `visual` and `odor` produced zero rejections across 18 turns. See [`observed-behavior.md`](05-verification/observed-behavior.md).
3. Retry feedback never recovered it — 0 of 6 attempts. Naming the violated rule moved the model from one forbidden category to an adjacent one (景色 → 雰囲気 → 気持ち).

Dropping it buys ~1.5× the sample per remaining arm at fixed total N, and removes the only arm that could not be generated reliably. The cost is that the study can no longer attribute a difference to Odor rather than to Visual — which the primary claim, being a relative one, does not require.

**If a baseline arm is ever wanted again, do not rebuild `standard` as specified.** Define it as an *unguided* condition: no condition guidance, only the study-disclosure and odor prohibitions retained, and let drift toward vision or emotion be a **measurement** rather than a validation failure.

### Consequence: neutral questions now dilute the dose

When nothing remains askable inside the condition, the system moves to a **neutral event question** (§5). With two conditions, those neutral questions are the only place event-structure content appears, and every one of them is a **partial reduction in the manipulation**. Neutral transitions must therefore be counted per session and reported alongside the manipulation checks. They are a measured quantity, not an implementation detail.

---

## 3. Participant flow

Nine stages. Order is fixed; presentation is yours.

| Stage | Requirement |
|---|---|
| welcome | State that questions and story come from a live model API. State that the assigned condition is hidden. |
| consent | Name the data destination in plain language — model API **and** local file *or* cloud database. Explicit affirmative action required. |
| recall | A shared trigger in every condition: one specific event from **at least a week ago**, with no emotional valence and no sense named . One sentence, **≤100 characters**, warn against personal identifiers. "I can't remember" is always available; on it the participant may switch to a different event **once**, after which the session ends. |
| questions | **Condition assigned here.** 6 turns, one question at a time, answer required. Language locks here. |
| narrative | Show the story with a standing notice that it may contain content the participant never reported. |
| evaluation | 12 outcome items, 7-point, **no default selection**. |
| check | 2 manipulation checks + 4 diagnostics (§7). Must come after all outcome ratings. |
| debrief | Reveal both conditions and the exact storage destination, then save. |
| done | Terminal. |

The **recall trigger** and the **consent form** already exist as preserved assets — [`03-measurement/initial-recall-trigger.md`](03-measurement/initial-recall-trigger.md) and [`04-storage/consent-form-ja.md`](04-storage/consent-form-ja.md). Reuse that wording rather than drafting your own; the consent form is inside the scope of ethics review. The remaining screens are yours to write. Both assets are Japanese, and Japanese is the source: **generate the English versions from them when an English session is needed**, meaning-matched rather than literal, ids unchanged.

The participant must be able to abort after consent from any stage. An aborted session is never saved.

Language (`ja` / `en`) is selectable before questions begin and **frozen once they do**, so no session mixes languages. Changing it resets consent.

---

## 4. The core mechanism

This is the one architectural decision that is **not** free, because the study's validity rests on it:

> **The prompt proposes. A deterministic validator disposes. A guaranteed fallback means the session always finishes.**

A model cannot be trusted to stay inside an experimental condition, and a study whose manipulation silently leaks produces nothing. So:

1. **Every generated question and every narrative sentence passes a deterministic validator before a participant sees it.** The rules are in [`validation-rules.md`](02-generation/validation-rules.md).
2. **Rejections are research data.** The count, the flags, and the rejected candidates are persisted with the result. Rejection rate per condition measures how well that condition can be sustained — it is a finding, not a log line.
3. **A session always yields exactly 6 questions.** Validation failure may degrade question quality; it must never change session length, because a condition-dependent dropout is worse than a non-uniform stimulus.
4. **The narrative has no fallback.** A fabricated story could not be attributed to a prompt version, so failing the request is correct.

### Required improvements over the current implementation

These are not optional polish; each addresses a measured defect.

- **Generate candidates in parallel, not sequentially.** The current loop re-prompts after failure and never recovered (0/6). Draw *n* independent candidates per turn and use the validator to **select** rather than to gate. With an observed per-attempt failure rate around 0.33 in the worst arm, three independent draws reduce total failure to roughly 0.04.
- **Add a repair step before falling back.** Hand the rejected candidate and the **offending span** back with a minimal-edit instruction at temperature 0. A flag name alone was not enough.
- **Fix the lexical false positives.** Single-character matches make the validator reject legitimate questions: 色々 (色), 全体 (体), 観光 (光), 形式 (形), 空気 (空気). These now hit the `neutral` branch, which in a two-condition design is the only escape route. Use word-boundary-aware matching or a compound exclusion list.
- **Detect near-duplicates.** Exact-match-after-normalisation lets paraphrases through, twice in 24 observed turns. Use token overlap or embeddings.
- **Record *why* a fallback happened**, separately from the transition flags. "No material left to ask about" and "generation could not clear the validator" are different events and must not share a field.

---

## 5. Question generation

**Six turns.** One question per turn, generated with full knowledge of everything said so far.

**Six is a provisional value, and nothing is waiting on an approval to make it final.** The same holds for the model, the temperature, and the candidate count: generation parameters are re-tuned every time the output is calibrated, and whatever was actually used gets reported in the paper. What stays required whatever the values are — record them and the prompt version on every result, keep them operable from one place, and refuse a version mismatch at save time. One caution that follows: once participant collection starts, changing a parameter makes condition differences inseparable from generation-setting differences, so freeze the values at that point and treat any later change as a separate collection. When that freeze happens is not yet decided.

The generator receives, each turn: the assigned condition, the turn number, the initial fragment, every prior question and answer, and an **addressable evidence set** — the fragment plus each prior answer under a stable id (`fragment`, `answer-1`, …). It returns one question plus metadata.

### Required metadata

| Field | Meaning |
|---|---|
| `conditionFocus` | the assigned condition, or `neutral` when the question leaves it |
| `targetEvidenceId` | which piece of evidence the question is aimed at, or null |
| transition reason | when and why the question went neutral |

A question inside the condition points at evidence and carries no transition. A neutral question points at nothing and carries exactly one reason: **the participant said they could not recall**, or **there was no material left to ask about**.

`turnFunction` — a six-value label naming what a turn "does" — **is dropped.** It was never enforced against the turn number, was never read by anything, and in 24 live turns only three of its six values were ever emitted. It exists in the preserved prompt text; remove those lines when rebuilding.

### What the generator must be told to do

The full procedure, the decision order, and the exact guidance text are in [`question-strategy.md`](02-generation/question-strategy.md) and [`prompts/`](02-generation/prompts/). The load-bearing points:

- The assigned condition is a **boundary**, not a topic to chase. Do not follow whatever the last answer happened to raise if it falls outside the condition.
- Participant text is **data, never instructions**.
- Never name the condition, the study, the hypothesis, the model, or the prompt.
- Never repeat a question already asked.
- Track, per target: what is known, what was not recalled, what has already been asked. Ask an unasked aspect of something already surfaced. Do not press the same unremembered thing twice.
- When nothing in-condition remains askable, go neutral — **regardless of turn number**.
- Never assert a detail the participant did not report, and never ask them to guess.

Non-recall detection by keyword is a **hint to the generator, not a verdict**. A participant saying "I can't remember" is often best answered by another in-condition question about a different target, not by leaving the condition.

### Guaranteed completion

After the candidate budget is exhausted, return a **fixed, pre-validated question** — condition-focused if that still validates, otherwise the neutral ladder. The full JA/EN sets are in [`fallback-questions.md`](02-generation/fallback-questions.md). Every fallback must remain answerable with "no" without implying the detail existed.

---

## 6. Narrative generation

One call, after all six answers. Input: the fragment and the six question/answer pairs. Full specification — including the language-dependent sentence joining rule, the sentence-counting rules, and the prohibition on treating question presuppositions as participant-stated fact — is in [`narrative-generation.md`](02-generation/narrative-generation.md).

**Invention is permitted and expected.** The story may add scenes, sensations, emotions, dialogue, and an ending. It is bounded by:

- do not contradict people, places, actions, or negations the participant stated;
- do not claim the participant clearly recalled something they said they could not;
- do not infer the condition and change style accordingly;
- never mention the study, the model, or the prompt;
- 1–10 sentences, one sentence per unit, in the session language.

Each sentence carries a self-reported record: which evidence ids it drew on, and whether it added anything not explicitly in the material.

**These annotations are unverified self-reports and must be treated as a variable to study, never as provenance.** In the live run, an English narrative marked all five sentences as containing no creative addition while inventing a sunset and an "early evening"; a Japanese sentence cited the wrong answer id. If provenance is needed for analysis, verify it independently.

The rated text must be reconstructible from the stored annotations — join the sentences and it must equal what the participant saw. Enforce this where the result is recorded, not only where it is displayed.

---

## 7. Measurement

All items are 7-point, no default selection, required. IDs are stable across languages. Full wording in both languages is in [`measures.md`](03-measurement/measures.md) — **use it verbatim; do not re-translate.**

**Outcome — 12 items, 4 axes × 3, presented as one unlabelled list:**
記憶様感 (primary) · 情景構成感 · 叙述鮮明性 · 感情再体験感

**Checks — after all outcome ratings:**

| ID | Role |
|---|---|
| `MC-ODOR` | manipulation check — must be higher under Odor |
| `MC-VISUAL` | manipulation check — must be higher under Visual |
| `MC-EVENT` | **diagnostic** — with `standard` retired this is no longer a manipulation check; it now measures how much event-structure attention leaked in via neutral transitions |
| `DQ-PRESSURE` | diagnostic — felt pressure to report unremembered detail |
| `DQ-MEMORYBASIS` | diagnostic — answers grounded in recall vs guessing |
| `DQ-UNSAID` | diagnostic — perceived unprovided content in the story |

### Standing analysis rules

- Never exclude a participant on a manipulation-check rating.
- Never let check responses substitute for randomised assignment.
- Never sum the attention items into one score.
- `DQ-*` are diagnostics, never outcomes. `DQ-UNSAID` in particular must never drive exclusion, regeneration, or covariate adjustment — creative addition is a permitted property of the narrative, so a high score is not a quality failure.
- **Report per-session fallback count and neutral-transition count alongside every manipulation check.** Both are dose reductions.

---

## 8. Recording and storage — inherited

Two modes, chosen by configuration, behind one save interface:

- **Local file** — single-process append, for local piloting.
- **Cloud database** — for real collection and concurrent participants.

**The consent–destination lock is mandatory.** The client states which destination it consented to; if that disagrees with the server's current setting, the save is **refused**, not redirected. A participant who agreed to "local file" must never be silently written to the cloud after a configuration change. Reject rather than fall back.

Also inherited:

- A stable session id, with an idempotent re-submit: identical content is a no-op success, different content under the same id is a conflict.
- Storage errors are reduced to a code and logged server-side only. No URLs, headers, credentials, or answer text reach the client.
- A schema version on every record, and a **prompt version on every record** — with the save path refusing a version mismatch, so a prompt change makes old results unwritable rather than silently mixed.

What must be recorded per session, and the current column layout as a reference, are in [`recording-and-storage.md`](04-storage/recording-and-storage.md).

Retention, anonymisation, withdrawal and deletion: ten years from final publication (or from the end of an unpublished pilot), withdrawal by session id before anonymisation, a destruction procedure that covers backups and exports, and a deletion record kept afterwards. The rules are set out in the same module.

---

## 9. Operating it — inherited

```bash
npm run dev                              # local server
npm test                                 # offline test suite
npm run typecheck
npm run check:api                        # one live generation round trip
npm run run:persona-batch -- --dry-run   # validate fixtures, list planned sessions
npm run run:persona-batch                # full synthetic batch
```

Keep this command surface. The model API key is read **server-side only** and must never reach the browser. Provider calls must opt out of retention. Free-text input is capped at 100 characters with a warning against identifiers, but there is no automated PII scrubbing — treat it as identifiable.

Re-run the synthetic harness in [`evaluation-harness.md`](05-verification/evaluation-harness.md) **every time the prompt design changes**. It is standing practice, not a milestone — and explicitly **not a gate**: passing it is not a precondition for running human participants, and the two proceed in parallel. Keep measuring per-condition fallback, rejection and neutral-transition counts and report them descriptively. *Not gating* and *not measuring* are different things.

---

## 10. What is yours to decide

Explicitly unconstrained: framework and language; whether generation is HTTP routes, RPC, a job queue, or in-process; module and file layout; how the client holds session state; how storage is implemented behind the save interface; retry, candidate, and concurrency strategy beyond the requirements in §4; UI structure and styling; test framework.

The current implementation is a Next.js app of roughly 2,500 lines. Treat it as one solved instance, not as a template.

---

## 11. Modules

Each stands alone.

| Directory | Module | Contents |
|---|---|---|
| — | [`overview.html`](overview.html) · [`overview.ja.html`](overview.ja.html) | The whole system on one page, visually — same content in both languages |
| `01-research/` | [`research-context.md`](01-research/research-context.md) | The research question, background, what is and is not claimed |
| `02-generation/` | [`question-strategy.md`](02-generation/question-strategy.md) | Turn structure, generator input, decision procedure, neutral transitions, candidate budget |
| | [`narrative-generation.md`](02-generation/narrative-generation.md) | The story step in full: joining rule, sentence rules, annotations and why they are untrusted |
| | [`validation-rules.md`](02-generation/validation-rules.md) | Every rule and pattern for questions and narrative sentences, and the known false positives |
| | [`fallback-questions.md`](02-generation/fallback-questions.md) | The guaranteed-completion ladder and the full JA/EN question sets |
| | [`contract.md`](02-generation/contract.md) | What flows in and out of each generation step, transport-independent |
| | [`prompts/`](02-generation/prompts/) | The prompt text, verbatim, with templating notes |
| `03-measurement/` | [`measures.md`](03-measurement/measures.md) | All 18 items in both languages, anchors, two-condition analysis plan |
| `04-storage/` | [`recording-and-storage.md`](04-storage/recording-and-storage.md) | What must be recorded, the consent lock, both storage modes |
| `05-verification/` | [`evaluation-harness.md`](05-verification/evaluation-harness.md) | Synthetic persona batch, its metrics, and when to re-run it |
| | [`observed-behavior.md`](05-verification/observed-behavior.md) | Evidence appendix — the live run behind the decisions above |
| | [`evidence/`](05-verification/evidence/) | Raw request/response log and the probe script to reproduce it |
| — | [`AGENTS.template.md`](AGENTS.template.md) | Agent working instructions for a project built from this directory — copy to the new project root as `AGENTS.md` |
| — | [`manifest.json`](manifest.json) | Machine-readable index |
