# Question Strategy

Requirements for the question generator. Concrete guidance text lives in [`prompts/`](prompts/); the rules that enforce it are in [`validation-rules.md`](validation-rules.md).

## Shape of a session

One session = **one initial fragment + exactly 6 generated questions + 6 answers + 1 generated narrative.**

Six is the fixed turn count and it propagates everywhere — the recorded arrays, the narrative input, the evidence id space. Make it one constant.

Condition (`visual` | `odor`) is assigned **after** a valid fragment is submitted, by block randomisation stratified by language with an allocation log (DEC-003 — block size, ratio and seed still open, TASK-016), and is never shown to the participant before debriefing.

## What the generator gets each turn

The generator is given the whole conversation every turn. Whether it is stateless per call or holds a session is your choice; what matters is that **no turn is generated without full knowledge of every prior turn**, because the core instruction — "ask something not yet asked about something already surfaced" — is unanswerable otherwise.

Required inputs:

| Input | Why |
|---|---|
| assigned condition | the boundary |
| turn number | budget awareness only, **not** a script position |
| initial fragment | turn 1 has nothing else; later turns still refer back to it |
| every prior question and answer | to know what was asked and what was recalled |
| **addressable evidence set** | so the question can name what it is aimed at |
| non-recall hint for the latest answer | a hint, not a verdict — see below |

The **evidence set** is the fragment plus each prior answer under a stable id (`fragment`, `answer-1`, `answer-2`, …). It is the only thing `targetEvidenceId` may point at. An id for a turn that has not happened yet must be impossible to produce — the model cannot cite evidence that does not exist.

At turn 1 the fragment is read as if it were the first answer.

## Output

One question, plus:

| Field | Values |
|---|---|
| `conditionFocus` | the assigned condition, or `neutral` |
| `targetEvidenceId` | an id from the evidence set, or null |
| transition reason | absent for in-condition questions; exactly one of *non-recall* / *no material left* for neutral ones |

Constrain the output shape at the model call (a strict JSON schema, or your equivalent) **and** re-check it after. The schema stops malformed output; the validator stops well-formed output that breaks the experiment.

`turnFunction` is **not** part of this contract. See [`DESIGN.md`](../DESIGN.md) §5 for why it was dropped.

## The decision procedure

This is the substance of the prompt. It is content-driven, not schedule-driven — there is no per-turn plan.

1. From the fragment and the full history, sort every target that falls **inside the condition** into: what is known, what was not recalled, what has already been asked.
2. If something already surfaced has an unasked aspect, ask about exactly that — one thing, answerable from memory. Never re-ask a detail already given. Use partial recall; do not press the same unknown twice.
3. Ask a short clarification only when a referent is genuinely ambiguous *and* needed to form the question.
4. When nothing inside the condition remains askable, move to a **neutral event question — regardless of turn number.**

For `odor`, the generator may open on smell even when the fragment contains no odor word. It must not re-press anything the fragment already marked as not remembered.

## Leaving the condition

Two legal reasons, and they must be recorded separately:

- **the participant said they could not recall**, or
- **there was no material left to ask about.**

A neutral question points at no evidence. An in-condition question carries no transition. Never both reasons at once.

**Every neutral transition is a partial reduction of the manipulation** — with two conditions, neutral questions are the only place event-structure content enters. Count them per session and report them. See [`DESIGN.md`](../DESIGN.md) §2.

## Non-recall is a hint, not a verdict

Keyword detection over the latest answer ("思い出せません", "can't remember", …) should do two things: select the transition guidance spliced into the prompt, and tell the generator what was detected.

It must **not** force the metadata. Observed live: when a participant said 「匂いは思い出せません」, the generator correctly stayed inside the condition and asked about a *different* smell, with no transition flag set. That is the desired behaviour.

The consequence for analysis is important enough to repeat: **the transition flag describes the question, not the answer.** It is not a record of whether the participant recalled. Read the answer text for that.

## Candidate budget and guaranteed completion

A bounded budget per turn, then a fixed fallback. The session length never changes.

**Draw candidates independently and in parallel**, using the validator to select among them. The current sequential retry — re-prompt with the failed flag names — recovered 0 of 6 observed failures; naming a violated rule moved the model to an adjacent forbidden category rather than out of them.

Before falling back, try one **repair**: hand back the rejected candidate and the offending span with a minimal-edit instruction at temperature 0. This preserves the candidate's reference to participant material, which a canned fallback loses entirely.

Persist every rejected candidate — attempt, flags, question text, metadata. This is research data (§4 of [`DESIGN.md`](../DESIGN.md)), and it must survive into analysis.

Record **why** a fallback was reached, in a field of its own. "No material left" and "generation could not clear the validator" are different events; the current implementation conflates them by reusing the transition reason.

Hard provider failures (auth, quota, service unavailable) should abort rather than burn the budget and silently degrade to a fallback.
