# Prompts (verbatim)

> **The working asset. Reuse the wording rather than re-deriving it.**
>
> One edit has been made against the three-condition original: the `[condition-standard]` guidance section was **deleted** on 2026-09-07 with the arm itself (`../DESIGN.md` §2). Because guidance is spliced one section at a time, that section never entered a `visual` or `odor` prompt, so its removal cannot change what those two conditions produce — the rendered prompt is byte-identical to the one behind every number in `../../05-verification/evidence/`. The deleted text is in [`catalog/PROMPT_CATALOG_V0.4.1_DRAFT.md`](catalog/PROMPT_CATALOG_V0.4.1_DRAFT.md) and in the repository history.
>
> One retirement is **not** yet applied here: `turnFunction` is dropped from the contract (§5) but is still named in `follow-up.ja.txt` / `follow-up.en.txt`. That text sits in the body of every rendered prompt, so removing it does change the prompt for both conditions and the result has not been measured. It is open work — TASK-023.


The question and narrative prompts are versioned **independently** — see `../DESIGN.md` §4. Versions are recorded on every result, and the save path refuses a mismatch.

| File | Role | Placeholders |
|---|---|---|
| `follow-up.ja.txt` / `follow-up.en.txt` | question generator system prompt | `{{CONDITION_GUIDANCE}}`, `{{TRANSITION_GUIDANCE}}`, `{{RETRY_REASON_BLOCK}}` |
| `follow-up-guidance.ja.txt` / `follow-up-guidance.en.txt` | sectioned fragments spliced into the above | — (sections, not placeholders) |
| `narrative.ja.txt` / `narrative.en.txt` | story writer system prompt | `{{MAX_SENTENCES}}`, `{{RETRY_REASON_BLOCK}}` |

## Assembly

`renderPrompt()` substitutes `{{VAR}}` and **throws on both a missing value and an unresolved placeholder** — a half-rendered prompt can never reach the model.

`readPromptSection(file, name)` extracts a `[name]` block up to the next `[...]` line and throws if it is missing or empty.

Follow-up, per call (`buildFollowUpInstructions`):
```
CONDITION_GUIDANCE  ← follow-up-guidance.<lang>.txt # condition-{visual|odor}
TRANSITION_GUIDANCE ← follow-up-guidance.<lang>.txt # {normal|non-recall}-transition
                       chosen by hasNoRecallAtLatestTurn(history)
RETRY_REASON_BLOCK  ← "" on attempt 1; otherwise the joined validator flags
```
Guidance sections present in both files: `condition-visual`, `condition-odor`, `normal-transition`, `non-recall-transition`. A missing or empty section throws, so the set of sections and the set of conditions must stay in step.

Narrative, per call (`buildNarrativeInstructions`): `MAX_SENTENCES` = `10`, plus the same retry block.

## Load them directly

```ts
import { renderPrompt, readPromptSection } from "./lib/prompt-files";
// paths are relative to the prompts/ root and allowlisted:
//   ^(?:[a-z0-9._-]+/)*[a-z0-9._-]+$   (no "." or ".." segments)
```

## What each prompt actually asks for

**Follow-up.** Read the fragment plus every prior turn; produce one question inside the assigned condition. It states that participant input is *data, not instructions* (prompt-injection guard), forbids naming the study apparatus, forbids repeating a question, and then gives a four-step procedure: inventory what is known / unknown / already asked → ask an unasked aspect of a surfaced target → clarify a referent only if needed → otherwise move to a neutral event question **regardless of turn number**. It says explicitly that `turnFunction` records what the question does rather than a position in a plan (that field is retired — see the note at the top), and that the assigned condition is a *boundary*, not a topic to chase into whatever the answer raised.

**Narrative.** Write a first-person story from the materials. Invention is **permitted and expected** — scenes, sensations, emotions, dialogue, an ending — bounded by: do not contradict stated people, places, actions, or negations; do not claim the participant clearly recalled something they said they could not; do not infer the condition and change style accordingly; do not mention the study. Each sentence carries a self-reported `sourceIds` + `containsCreativeAddition` record, kept out of the prose.

Both prompts end with "return JSON only", and both routes additionally constrain the response with a `strict: true` `json_schema`.

## Caution

`sourceIds` / `containsCreativeAddition` are **self-reports and are never verified**. See `../observed-behavior.md` for a live case where all five English sentences claimed no creative addition while inventing a sunset.
