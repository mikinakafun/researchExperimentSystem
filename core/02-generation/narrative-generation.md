# Narrative Generation

One call, after all six answers. The output is the object the participant rates, so every detail here is measurement apparatus.

Prompt text: [`prompts/narrative.ja.txt`](prompts/narrative.ja.txt) / [`prompts/narrative.en.txt`](prompts/narrative.en.txt) — preserved verbatim, reuse it.

## Input

| | |
|---|---|
| materials | the fragment plus the six answers, each under a stable id (`fragment`, `answer-1` … `answer-6`) |
| question context | the six questions, paired to the answer they produced |
| language | the session language |
| sentence ceiling | 10 |

### The questions are context, not facts

The six questions carry the condition's presuppositions in their wording. **The generator must be told not to treat an assumption inside a question as something the participant reported.**

This is the single most important safeguard in this step. Without it, the assigned condition reaches the narrative directly through the question text rather than through the participant's answers — the one path the whole design exists to close. A `visual` question that mentions the arrangement of a flower bed must not license a narrative sentence asserting there was one.

The questions are supplied only so the generator can interpret what a terse answer is answering.

## What the generator is asked to do

**Invention is permitted and expected.** The story may add scenes, sensations, emotions, actions, dialogue, connections between events, and an ending. This is not a leak to be tolerated — it is the property being studied, disclosed to participants in every condition.

Bounded by:

- do not contradict people, places, actions, or negations the participant stated;
- "I can't remember" marks uncertainty — the gap may be filled creatively, but the story must never present it as something the participant clearly recalled;
- **do not infer the condition and change style or approach accordingly** — build from the material as a whole;
- choose a voice that fits the input; not every story needs a moving, happy, or nostalgic ending;
- never mention research, experiments, conditions, AI, prompts, or instructions;
- write in the session language even when the input is in another language;
- combine, de-duplicate, reorder, and paraphrase so the result reads as prose rather than a list of answers.

The "do not infer the condition" instruction matters because the answers themselves are condition-shaped: six answers full of smells signal the odor arm. If the generator adapts its style to that signal, condition differences in the rating could come from the writing style rather than from the recalled content.

## Output

1 to 10 sentences. **Each unit holds exactly one sentence**, plus a self-report record kept out of the prose:

| Field | Meaning |
|---|---|
| `sourceIds` | which material ids the sentence drew on; **may be empty** for a wholly invented sentence |
| `containsCreativeAddition` | true if the sentence adds anything not explicit in the material; **must be true when `sourceIds` is empty** |

`sourceIds` does **not** mean every detail in the sentence appears in those materials. It is a pointer, not a proof.

## The joining rule

The displayed narrative is the sentences joined:

| Language | Separator |
|---|---|
| `ja` | **empty string** — 「〜した。」+「〜だった。」→「〜した。〜だった。」 |
| `en` | **single space** |

This is small and load-bearing. The save path requires that **joining the stored sentences reproduces the displayed text exactly** — the rated narrative must be reconstructible from its annotations, so a rated story can never drift from the record of how it was built. Get the separator wrong and that gate fails for one language only, which is the kind of bug that survives testing in the other.

Trim each sentence before joining and store the trimmed form, so display and record cannot diverge by whitespace.

## Structural rules

Enforced by the validator; full list in [`validation-rules.md`](validation-rules.md).

- 1 to 10 sentences, no duplicates.
- **Exactly one sentence per unit.** Japanese: count terminal marks `。！？!?`. English: sentence-segment the text and require final punctuation. A unit containing two sentences is rejected.
- Script must match the session language.
- No study-apparatus wording, in any sentence.
- `sourceIds` must be unique within a sentence and must all exist in the material set — no invented ids.
- Empty `sourceIds` with `containsCreativeAddition: false` is rejected. Content must be claimed as either sourced or invented, never neither.

## The annotations are unverified

**They are never checked against the sentence text, and they are wrong in practice.** From the live run:

- An English narrative marked **all five sentences** `containsCreativeAddition: false` while writing *"the sky transformed into a breathtaking gradient of orange and pink, wrapping up our perfect day"* — a sunset, an evening, and an evaluation that appear in no answer.
- A Japanese sentence cited `answer-2, answer-3` for content that came from `answer-4`.

Consequences for the rebuild:

1. Keep collecting them — they are a legitimate **variable to study** (does the model's self-assessment of its own invention differ by condition or language?).
2. **Never use them as provenance.** Any analysis counting creative additions from this field will undercount, and will undercount unevenly across languages.
3. If provenance is genuinely needed, verify it independently — human coding or a separate judge model, on the sentence text.
4. Do not gate, regenerate, or exclude on them. `DQ-UNSAID` — the participant's own perception of unprovided content — is the measured construct here, and it too is a diagnostic, never an exclusion criterion.

## Failure

**There is no narrative fallback.** After the candidate budget is exhausted, the request fails.

This is deliberate and asymmetric with the question path. A canned question is still a question asked under a recorded condition; a canned story could not be attributed to a prompt version and would silently enter the analysis as if generated. Failing is the honest outcome.

The narrative generation record must therefore never be a fallback record — the save path rejects one that is.

## Parameters

| | |
|---|---|
| temperature | 0.75 (higher than question generation — invention is wanted here) |
| sentence ceiling | 10 |
| attempts | bounded, then fail |
| output shape | constrain at the call (strict schema) **and** re-check after parsing |

On retry, feed back what was rejected. As with questions, a rule name alone is weak feedback — prefer the offending sentence and what was wrong with it.
