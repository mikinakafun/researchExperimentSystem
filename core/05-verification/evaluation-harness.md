# Evaluation Harness

**Inherited. Run continuously — but it is not a gate.**

The offline evaluation harness. It runs the **real pipeline end to end** — the same generation path, prompts, validator, and storage as a real session — with an LLM playing the participant against a fixed ground-truth memory. This is how the system is regression-tested without recruiting anyone.

```bash
npm run run:persona-batch -- --dry-run   # validate personas, validate fixtures, list planned sessions
npm run run:persona-batch                # execute (needs the dev server + a live key)
```

## Design

**10 personas × 2 conditions = 20 sessions × 6 turns = 120 question calls + 20 narratives.**

The ten personas are [`personas.mjs`](personas.mjs) in this directory — a preserved asset; the 2026-07-25 and 2026-09-05 batches ran on them. Each persona carries a one-sentence `fragment` (matching the recall-step input) and a `groundTruth` memory that must contain all seven sections:

```
【出来事の流れ】【視覚】【聴覚】【触覚・身体】【匂い】【感情】【覚えていないこと】
```

The final section is the point of the whole design: **each persona has an explicit list of things it does not remember**, so non-recall is a controlled condition rather than an accident. **3 of the 10 personas have `odorMemory: false`** — they must answer 「匂いは思い出せません」 under the odor condition. That gives the odor arm a known-negative subgroup.

`validatePersonas()` runs before any request and hard-fails on: duplicate ids, a count other than 10, a `fragment` that does not match the expected list positionally, a `groundTruth` missing any of the seven sections, or a count other than 3 for `odorMemory: false`. The fixtures cannot silently drift.

## Participant simulation

A separate direct call to the Responses API (**not** through the app's routes), `temperature 0.7`, `json_schema` `{answer: string}`. The instructions pin the persona hard:

- Answer **only** from the memory above; it is your own experience from a week ago.
- 1–2 Japanese sentences, です・ます調.
- If asked about anything not in the memory, answer **only** 「思い出せません」 or 「分かりません」.
- Answer only what was asked — do not volunteer extra detail.
- Never mention the experiment, the persona, or these instructions; never quote the memory's headings.

Two bounded repairs: an empty answer is retried once, and an answer over 180 characters is retried once asking for ≤2 sentences. A still-empty answer aborts the session; a still-long one only warns.

The "answer only what was asked" rule matters — without it the simulated participant volunteers sensory detail unprompted and the condition contrast collapses at the source rather than at the question.

## Session loop

Identical to a participant session: full history each turn, then the narrative over all 6 pairs, then a save as a **synthetic** record with ratings omitted entirely (the one relaxation that exists precisely for this path). The session id is deterministic — batch, condition, persona — so a re-run is idempotent: identical content is a no-op success, changed content is a conflict.

Every session is appended to a run log (one JSON object per line) with all turns, metadata, per-turn source/attempts/rejections, and the narrative annotations.

## What the batch reports

A JSON summary on stdout:

- `saved` / `failed` / `failures[]`
- **fallback** — fallback turn count and affected sessions, **per condition**. The primary health metric. Report neutral-transition count beside it: both are dose reductions.
- **`odorNonRecallSessions`** vs **`odorNonRecallExpected`** — did the 3 no-odor personas actually produce 「匂いは思い出せません」 under the odor condition? A mismatch means the simulated participant broke character, and the run is not interpretable.
- **leak summary** — counts of odor wording (`匂い|におい|香り|香ば|臭`) in questions (visual arm only), in answers, and in narratives, per condition. Odor wording in a `visual` question means the validator failed.

Plus a per-session warning when a **narrative contains odor wording while no answer did** — narrative-level confabulation of the study's target modality. Given the live finding that `containsCreativeAddition` is unreliable, this crude lexical check is currently the more trustworthy confabulation signal of the two.

## Companion

A batch-diff tool compares two runs, for judging whether a prompt revision actually helped. Keep that capability — it is how a change to the validator or the guidance gets evaluated instead of argued about. The runs from the previous implementation, with the configuration that produced each, are in [`evidence/`](evidence/README.md); they are records of older prompt versions and of the three-condition design, and the numbers in them are the reference points the decisions cite.

---

## When to run it, and what it is not

**Run this every time the prompt design changes** — question-selection guidance, condition guidance, validator rules, candidate strategy. It is standing practice, not a milestone: changing how questions are chosen and not re-running it means the next result describes a system that no longer exists.

**Passing it is not a precondition for running human participants.** The synthetic re-evaluation and human piloting proceed **in parallel**. There is no pre-registered threshold that blocks an arm, and no machine gate in front of data collection.

That is a deliberate trade. Without a front gate, human collection can begin while a condition's fallback rate is still high. The mitigation is measurement, not permission:

- **Keep measuring** per-condition fallback rate, rejection rate, and neutral-transition count. *Not gating* and *not measuring* are different things.
- **Report them descriptively** in the results, per condition.
- **Never** use them as an exclusion criterion, and never as a covariate — they are consequences of the assigned condition, so adjusting for them would absorb part of the effect.

What the harness is for, then: catching a change that breaks a condition, and quantifying how well each condition can be sustained. The retired `standard` arm is the worked example — a fallback on 2 of 6 turns, every validation rejection in the run, and none of it visible on any participant-facing screen. Only the generation records showed it. That is the class of problem this run exists to surface early, whether or not anything is blocked on it.

## Two things worth watching in every run

- **Persona fidelity** — the no-odor personas must actually produce non-recall under the odor arm. If the simulated participant broke character, the run says nothing about the system and its numbers should not be reported.
- **Cross-condition leakage in questions** — any odor wording in a `visual` question is a validator failure, and a defect to fix rather than a statistic to note.
