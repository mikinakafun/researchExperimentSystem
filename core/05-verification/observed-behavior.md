# Observed Behavior — Evidence Appendix

**This records the behaviour of the previous three-condition implementation.** The index of every run on record, with the configuration behind the numbers, is [`evidence/README.md`](evidence/README.md). It is kept because requirements in the [integrated specification](../../docs/SPEC.md) rest on it — retiring `standard`, replacing sequential retry with parallel candidates, distrusting the narrative annotations, fixing the duplicate check. It is evidence, not a specification. Nothing here establishes the current implementation state.

Produced by driving the running app against the real OpenAI API on **2026-09-07 03:15-03:17 UTC**: four full 6-turn conversations (24 question calls), two narrative calls, five malformed-request probes.

Model that actually answered: **`gpt-4o-mini-2024-07-18`**.
Fragment: 「休日に友人と公園を歩いた。」 / "I walked through a park with a friend on a day off."

## Headline: the `standard` condition is the fragile one

| Conversation | Generated | Fallback | Rejected candidates |
|---|---|---|---|
| ja / standard | 4 | **2** | **6** |
| ja / visual | 6 | 0 | 0 |
| ja / odor | 6 | 0 | 0 |
| en / visual | 6 | 0 | 0 |

Every rejection in the whole run came from `standard`, and every one was a **contamination** flag — never a schema or metadata error:

- `standard_sensory_contamination` ×4 — the model kept reaching for 景色 / 風景 / 雰囲気:
  - 「その公園で友人と座っていたベンチの周りには、どんな**景色**や人々がいましたか？」
  - 「公園を歩いているとき、周りの**景色**や**雰囲気**について何か思い出せることはありますか？」
- `standard_emotion_focus` ×2:
  - 「公園での友人との会話の中で、どんな**気持ち**で話していましたか？」
  - 「その公園での友人との会話の中で、どんな**感情**を感じましたか？」

**The retry feedback did not rescue either turn.** At turn 3, all three attempts failed with the identical flag; at turn 6, attempts 2 and 3 both failed on emotion after attempt 1 failed on sensory wording. Feeding the flag name back as `RETRY_REASON_BLOCK` moved the model from one forbidden category to another rather than out of them.

This is structural, not bad luck: `standard` is defined by *exclusion* (no sensory, no emotion, no atmosphere), and 雰囲気/景色 are the natural Japanese words for "what was it like there". The condition that most needs to look neutral is the one most likely to be served by a canned fallback.

## Both fallback paths were exercised

- ja/standard **turn 3** → ladder **step 1**: 「その出来事の中で、何をしていたか覚えていますか？」, `conditionFocus: "standard"`, `turnFunction: "broad_recall"`, both transition flags `false`.
- ja/standard **turn 6** → ladder **step 2**: 「同じ出来事の中で、ほかに何が起きたか覚えていますか？」, `conditionFocus: "neutral"`, `insufficientEvidenceTransition: true`.

Turn 6 fell to the neutral ladder because the step-1 condition question was already used verbatim at turn 3 and tripped `duplicate`. The ladder is self-correcting through the validator, exactly as written.

## turnFunction does not follow the nominal turn map

Across all 24 accepted turns, only **three of six** function values ever appeared, and just two of them covered **23 of 24**:

| Value | Accepted | At turns | Also seen in rejected candidates |
|---|---|---|---|
| `broad_recall` | 12 | 1,2,3,4,5,6 | 3 |
| `grounded_detail` | 11 | 2,3,4,5,6 | 1 |
| `action_relation` | 1 | 1 | 2 |
| `temporal_anchor` | **0** | — | 0 |
| `second_grounded_detail` | **0** | — | 0 |
| `unresolved_attribute` | **0** | — | 0 |

ja/standard turn **1** came back as `action_relation`, not `broad_recall`. Turn 6 was `broad_recall` in three of four conversations.

Confirmed: `TURN_FUNCTIONS` is a nominal label set, and the validator's membership-only check is what the model actually exploits. **Do not analyse `turnFunction` as if it were a designed progression** — in practice it is a coarse two-value field.

## targetEvidenceId

Values observed: `"fragment"` (11×), `"answer-1"`…`"answer-5"` (11×), `null` (2×, both fallbacks). No invalid ids, no `invalid_target_evidence_id` flags. The model reliably re-anchored on later answers as the conversation grew, but also returned to `fragment` late (en/visual turns 4–6).

## Non-recall did NOT trigger a neutral transition

Non-recall answers were planted and the lexical detector matched them:

- ja/odor answer-2: 「匂いは思い出せません。」 → turn 3 request carried `lastAnswerWasNonRecall: true`.
- ja/visual answer-5: 「そのときの具体的な光景については、正直あまりよく思い出せません。」 → turn 6 likewise.

In **both** cases the model stayed **in-condition** with `nonRecallTransition: false`, and simply switched to a different in-condition target:

- odor turn 3: 「公園での時間の中で、他にどんな匂いを感じたことがあるか、思い出せる範囲で教えてください。」
- visual turn 6: 「公園の中で見た他の植物について、何か覚えていることはありますか？」

This is **correct** behaviour, and it is the single most misread part of the design. The guidance offers two legal responses to non-recall — *another in-condition target* or *a neutral question* — and only the second sets `nonRecallTransition`. The flag describes **the question**, not the answer. A `nonRecallTransition: false` row does not mean the participant recalled; use the answer text for that.

## The duplicate check only catches exact repeats

Near-duplicates passed validation in both visual conversations:

- ja: turn 4 「公園の中で特に目を引いた**木**の形や大きさについて教えてください。」 → turn 5 「公園の中で特に目を引いた**花**の形や大きさについて、何か思い出せることはありますか？」
- en: turn 5 "What did **the pond** look like as you walked past it?" → turn 6 "What did **the area around the pond** look like as you walked by it?"

`normalize()` compares whole strings, so one changed noun defeats it. Late turns in a well-answered condition tend toward paraphrase, because the prompt's "ask something not yet asked" instruction has nothing left to reach for.

## Narrative

Both calls: `source: "generated"`, **first attempt accepted, zero rejections**, `promptVersion: "prompt-catalog-v0.4.3-mock-draft"`, **5 sentences** each (ceiling is 10).

`containsCreativeAddition` — ja: 3 of 5 `true`. en: **0 of 5 `true`**.

The English self-report is demonstrably wrong. Marked `containsCreativeAddition: false` (i.e. "edits explicit information only"):

> "As our day came to an end and we left in the early evening, the sky transformed into a breathtaking gradient of orange and pink, wrapping up our perfect day."

The sky gradient, the early evening, and "our perfect day" appear in no answer. `sourceIds` are unreliable too: the ja sentence 2 cites `answer-2, answer-3`, but its content 「お互いの近況を話し始めました」 comes from `answer-4`.

**Treat `sourceIds` and `containsCreativeAddition` as a model self-report variable to be studied, never as provenance ground truth.** The code says this; the live run proves it. The narrative prompt explicitly *permits* invention, so this is not a bug — but any analysis that counts creative additions from this field will undercount, badly, and unevenly across languages.

## Malformed-request probes

| Probe | Status | Body |
|---|---|---|
| `history.length (1) !== turn-1 (2)` | 400 | `{"error":"Invalid follow-up request."}` |
| `condition: "invalid"` | 400 | `{"error":"Invalid follow-up request."}` |
| `turn: 7` | 400 | `{"error":"Invalid follow-up request."}` |
| `language: "fr"` | 400 | `{"error":"Invalid follow-up request."}` |
| narrative with 5 answers | 400 | `{"error":"Invalid narrative request."}` |

All rejected before any provider call, with a single opaque message per route.

## The 2026-09-06 run: what visual and odor do when they fail

The 24-turn run above used one fragment and saw no visual or odor rejection. The larger run the day before — [`evidence/validation-v044-live-2026-09-06/`](evidence/validation-v044-live-2026-09-06/report.md), three synthetic scenarios × three conditions × six turns, 54 questions — is where the two remaining non-`standard` failure modes appear. Both are about the **shape** of the metadata, not about condition vocabulary:

| Where | What the model did | Flag | Outcome |
|---|---|---|---|
| odor · partial-recall scenario · turn 2 | returned an in-condition question (`conditionFocus: odor`) with a transition flag set, three attempts in a row | `focused_question_with_transition` ×3 | fixed fallback — the only visual/odor fallback in the run (1/36) |
| odor · persistent non-recall · turn 4 | returned the **string** `"null"` as `targetEvidenceId` twice; the strict schema (`anyOf: string | null`) accepts a string | `invalid_target_evidence_id` ×2 | accepted on attempt 3 |

Rejections in that run by flag: `standard_sensory_contamination` 17, `standard_emotion_focus` 4, `focused_question_with_transition` 4, `invalid_target_evidence_id` 2. The retry feedback did not change the odor model's metadata choice across the three attempts, the same pattern as the `standard` contamination loop above.

The same report also records behaviour that passes validation and is not a fallback:

- After 「匂いについては思い出せません。」 the odor arm went neutral at turn 2, then **returned to smell at turn 3 and kept asking about smell through turn 6** while the participant kept answering non-recall. The visual arm under persistent non-recall likewise asked about buildings, colours and light for five turns without going neutral.
- In `standard`, a question about clothing (外見) and one inviting 「特別なことを感じた瞬間」 passed the lexical check.
- A fixed fallback at turn 5 re-asked 「何をしていたか」 after the participant had already described the actions — the ladder avoids repeating a question, not repeating known information.
- The narrative under persistent non-recall wrote 「外の空気が心地よく…ことだけは確かだ」 with every answer being 「思い出せません」 — invention is permitted, but this presents it as certain recall.

Across all stored runs, `odor_source_inference` fired 0 times (the rule was narrowed anyway), `odor_condition_contamination` 186 times, `standard_sensory_contamination` 225 times.

## What this evidence established

Each of these became a requirement in the [integrated specification](../../docs/SPEC.md). This section records the inference; the specification records the outcome.

1. **The validator earns its place.** It is the only thing separating the conditions, and it caught 6 real violations in 24 turns. → kept as the core mechanism (§4).
2. **`standard` could not be generated reliably.** 2 of 6 turns canned, all 6 rejections, zero recovery — while `visual` and `odor` had zero rejections in 18 turns. → **the arm was retired** (§2), not repaired. A baseline arm, if ever wanted again, is defined as *unguided* rather than by exclusion.
3. **Flag-name-only retry feedback is weak.** → parallel candidate selection plus a repair pass carrying the offending span (§4).
4. **Exact-match duplicate detection is not enough by turn 5.** → near-duplicate detection required (§4).
5. **`turnFunction` was inert** — never enforced, never read, 3 of 6 values never emitted. → **dropped from the contract** (§5).
6. **`sourceIds` and `containsCreativeAddition` are unreliable self-reports.** → kept as a variable to study, never as provenance (§6).
7. **Generation health is invisible from the participant screens.** The `standard` failure showed up only in the generation records. → the synthetic harness became standing practice, re-run on every prompt-design change ([operations](../../README.md)) — though **not** a gate in front of human collection — and fallback and neutral-transition counts became reported quantities (`measures.md`).

---

## Raw evidence

`evidence/live-run-2026-09-07.json` — every request and response from this run, including all retry attempts.
`evidence/live-probe.mjs` — the script that produced it. Re-run against a live dev server to reproduce.

```
{ meta, conversations: {ja_standard, ja_visual, ja_odor, en_visual}, narratives, edgeProbes }
```
Each turn is `{turn, request, result.attempts[].{requestBody, status, responseBody}}`.
