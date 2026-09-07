# Evaluation Harness

**Inherited, and promoted to a go/no-go gate.**

The offline evaluation harness. It runs the **real pipeline end to end** — the same generation path, prompts, validator, and storage as a real session — with an LLM playing the participant against a fixed ground-truth memory. This is how the system is regression-tested without recruiting anyone.

```bash
npm run run:persona-batch -- --dry-run   # validate personas, validate fixtures, list planned sessions
npm run run:persona-batch                # execute (needs the dev server + a live key)
```

## Design

**10 personas × 2 conditions = 20 sessions × 6 turns = 120 question calls + 20 narratives.**

Each persona carries a one-sentence `fragment` (matching the recall-step input) and a `groundTruth` memory that must contain all seven sections:

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

A batch-diff tool compares two runs, for judging whether a prompt revision actually helped. Keep that capability — it is how a change to the validator or the guidance gets evaluated instead of argued about. Any archived runs from the previous implementation are historical records of older prompt versions and three-condition designs; they are not current behaviour.

---

## The go/no-go gate

**This harness runs before any human participant, and its result is a gate, not a report.**

Pre-register a maximum fallback rate **per condition** and refuse to administer an arm that exceeds it. A suggested starting threshold is **≤5% of turns** (≈3 of 60 turns per arm at 10 personas). Set the number before running, not after seeing the result.

Rationale, from the live run: the retired `standard` arm produced a fallback on 2 of 6 turns — roughly 33% — and every validation rejection observed in the whole run. It failed silently. Nothing in a participant-facing screen would have shown it; only the generation records did. A condition that cannot be generated reliably cannot be administered reliably either, and discovering that after collection is discovering it too late.

Also gate on:

- **Persona fidelity** — the no-odor personas must actually produce non-recall under the odor arm. If the simulated participant broke character, the run says nothing about the system.
- **Zero cross-condition leakage in questions.** Any odor wording in a `visual` question is a validator failure and blocks release.

Re-run the gate after any change to the prompts, the validator, or the candidate strategy.
