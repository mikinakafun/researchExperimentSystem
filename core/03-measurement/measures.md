# Measures

The rating instrument. **Use this wording verbatim in both languages — do not re-translate.** The items are a preserved asset; the analysis plan below reflects the two-condition design.

18 items total, all **7-point radio, no default selection**, all required before the step advances. Item IDs are stable across languages — translating a label never changes an ID. The default anchors are 全くそう感じない / 非常に強くそう感じる ("Not at all" / "Very strongly"); the six check items override them.

## Step `evaluation` — 12 outcome items, 4 axes × 3

ID scheme `eval-<axis>-<0|1|2>`. **The axis name inside the ID is Japanese**, e.g. `eval-記憶様感-0`. Presented as one flat undifferentiated list — axis names are never shown to participants, and the items are not shuffled.

### 記憶様感 — memory-likeness
| ID | JA | EN |
|---|---|---|
| `eval-記憶様感-0` | この文章は、実際にあった個人的出来事を思い返したもののように感じられる。 | This story feels like a recollection of a personal event that actually happened. |
| `eval-記憶様感-1` | この文章は、自分の実体験の語りとして自然に感じられる。 | This story feels natural as an account of my own lived experience. |
| `eval-記憶様感-2` | この文章には、過去の出来事を思い返しているような「思い出らしさ」がある。 | This story has a memory-like quality, as if I were recalling a past event. |

### 情景構成感 — scene construction
| ID | JA | EN |
|---|---|---|
| `eval-情景構成感-0` | この文章を読むと、出来事の場面全体を一つのまとまりとして思い描ける。 | Reading this story, I can picture the whole scene of the event as a coherent whole. |
| `eval-情景構成感-1` | 場所の広がりや、人物・物の配置がはっきり思い浮かぶ。 | I can clearly picture the layout of the place and the positions of people and objects. |
| `eval-情景構成感-2` | 自分がその場にいるように、場面を内側から見渡せる感じがする。 | I feel as though I can look around the scene from within, as if I were there. |

### 叙述鮮明性 — narrative vividness
| ID | JA | EN |
|---|---|---|
| `eval-叙述鮮明性-0` | この文章は、全体として鮮明で具体的に感じられる。 | Overall, this story feels vivid and concrete. |
| `eval-叙述鮮明性-1` | この文章には、場面や出来事を生き生きと感じさせる細部が含まれている。 | This story contains details that make the scene or event feel alive. |
| `eval-叙述鮮明性-2` | 出来事の様子が、ぼんやりではなく、はっきり伝わってくる。 | The event comes across clearly rather than vaguely. |

### 感情再体験感 — emotional re-experiencing
| ID | JA | EN |
|---|---|---|
| `eval-感情再体験感-0` | この文章を読むと、その出来事のときに感じた感情がよみがえる。 | Reading this story brings back the emotions I felt during the event. |
| `eval-感情再体験感-1` | この文章を読んでいる間、当時の感情をもう一度体験しているように感じる。 | While reading this story, I feel as though I am experiencing those emotions again. |
| `eval-感情再体験感-2` | この文章は、当時の感情を自分の中に呼び戻す。 | This story reawakens the emotions I felt at the time. |

## Step `check` — 2 manipulation checks + 4 diagnostics

Presented **after** all outcome ratings, before debriefing, so the items cannot cue the rating step.

| ID | Category | EN wording | Anchors (1 / 7) |
|---|---|---|---|
| `MC-EVENT` | **diagnostic** | To what extent did the questions direct your attention to actions, people, interactions, and the order of events? | Not at all / Very strongly |
| `MC-VISUAL` | manipulation check | To what extent did the questions direct your attention to visual details, such as the appearance of objects or people, colors, brightness, and arrangement? | Not at all / Very strongly |
| `MC-ODOR` | manipulation check | To what extent did the questions direct your attention to smells or scents in the air? | Not at all / Very strongly |
| `DQ-PRESSURE` | diagnostic | To what extent did you feel asked to provide details you could not actually remember? | Not at all / Very strongly |
| `DQ-MEMORYBASIS` | diagnostic | To what extent were your answers based on what you actually remembered rather than guesses? | Not at all / Entirely |
| `DQ-UNSAID` | diagnostic | To what extent did you feel the generated story included content you had not provided? | None at all / A great deal |

`MC-ODOR` and `MC-VISUAL` are the manipulation checks: each condition should raise its own item.

**`MC-EVENT` is no longer a manipulation check.** With the `standard` arm retired there is no event-structure condition for it to verify. It is kept as a **dilution diagnostic**: event-structure content now enters a session only through neutral transitions and fallbacks, so `MC-EVENT` measures how much of that leaked in. Expect it to correlate with the per-session neutral-transition count — and if it does not, one of the two measurements is wrong.

## Analysis plan

Two groups, so the primary test is a straight between-group comparison — no contrast coefficients.

**Manipulation check (must pass before outcomes are interpreted):**

- `MC-ODOR` higher under Odor than Visual.
- `MC-VISUAL` higher under Visual than Odor.

**Primary outcome:** 記憶様感, mean of its three items, Odor vs Visual.

**Secondary outcomes:** 情景構成感, 叙述鮮明性, 感情再体験感, reported individually and never pooled.

**Evidence classification**, applied to the primary comparison:

- **strong** — estimate in the predicted direction, two-sided 95% CI excludes zero
- **inconclusive** — estimate in the predicted direction, CI includes zero
- **failed or reversed** — estimate zero or in the opposite direction

**Report unconditionally, per condition:** fallback count, neutral-transition count, and validation-rejection count per session. These are dose reductions and generation-health measures, not diagnostics to be mentioned only when convenient.

### Standing rules
- Never exclude participants on a manipulation-check rating.
- Never substitute check responses for randomised assignment.
- Never sum the attention items into one score.
- `DQ-*` and `MC-EVENT` are diagnostics, not outcomes.
- `DQ-UNSAID` is a per-condition diagnostic only — never for exclusion, regeneration, or as a covariate. Creative additions are a permitted property of the narrative, so a high score is **not** a quality failure.
- **Do not adjust outcomes for fallback count.** It is a consequence of the assigned condition, so covariate adjustment would absorb part of the effect. Report it; do not control for it.

## Reference materials during rating

At both rating steps the participant must be able to re-read the narrative; at the `check` step the six questions they were asked must also be available. Present both collapsed by default, so re-reading is a deliberate act rather than a persistent prompt.

## Generation health is part of the instrument

A fallback question is a different stimulus from a generated one, and a neutral question is a partial withdrawal of the manipulation. A session whose questions were half canned did not receive the condition at full strength.

This is why [`DESIGN.md`](../DESIGN.md) §9 makes the synthetic harness a go/no-go gate: a condition that cannot be generated reliably cannot be administered reliably either. The retired `standard` arm failed exactly here — 2 of 6 turns canned — and it failed silently until the generation records were examined.

Carry the per-session generation source, fallback count, and neutral-transition count into the analysis dataset, not just into a log.
