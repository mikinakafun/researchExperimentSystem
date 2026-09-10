# Validation Rules

The enforcement half of the design. The prompt asks; the validator decides. A candidate is accepted only when it produces **no** rule violations.

These rules are a preserved asset — they were tuned against real model output and caught 6 real condition violations in 24 live turns. Reuse them. Do not re-derive them.

## Question rules

### A. Output shape
The model call should be constrained by a strict schema, but re-check the parsed object anyway: question is a non-empty string, `conditionFocus` is one of the allowed values, `targetEvidenceId` is a string or null, the transition reason is well-formed. A schema failure and a content failure are both rejections; keep them distinguishable in the recorded flags.

### B. Metadata consistency

| Violation | Condition |
|---|---|
| invalid condition focus | not the assigned condition and not `neutral` |
| multiple transitions | more than one transition reason given |
| invalid target evidence | id is not `fragment` or `answer-1..answer-{turn-1}` |
| neutral without reason | `neutral` focus carrying no transition reason |
| neutral must not target | `neutral` question still pointing at evidence |
| focus mismatch | non-neutral focus that is not the assigned condition |
| focused with transition | in-condition question carrying a transition reason |

### C. Question text

| Violation | Condition |
|---|---|
| empty | trimmed question is empty |
| study disclosure | mentions the study apparatus (pattern below) |
| output language mismatch | script does not match the session language |
| duplicate | normalised question equals an earlier one |
| neutral focus contamination | a `neutral` question uses sensory **or** emotion wording |
| visual: odor contamination | `visual` question uses odor wording |
| visual: condition contamination | `visual` question uses auditory, bodily, or emotion wording |
| odor: condition contamination | `odor` question uses visual, auditory, bodily, or emotion wording |
| odor: source inference | `odor` question asks the participant to explain a cause or to guess at a source |

Contamination checks are skipped for `neutral`, which is instead held to the stricter combined sensory-or-emotion rule.

`odor: source inference` has no counterpart in `visual`. It covers explicit requests to reason — "why", "what caused it", "guess" — and nothing else.

Naming what an odor was an odor of is **not** a violation. Olfactory perception is object-based: the source label is the percept, not an inference about it, and in Japanese it is close to the only available way to describe a smell. Forbidding it left `odor` unable to ask for object identity while `visual` asked for it freely — an asymmetry in the one contrast the two-condition design is built on. The narrower rule was never load-bearing in practice: the flag fired zero times across every stored evaluation artifact.

> The `standard` condition's two rules — sensory contamination and emotion focus — are **retired** with the arm itself. See the [integrated specification](../../docs/SPEC.md).

### Normalisation before the duplicate check
NFKC → strip whitespace → strip `？?。！!、,「」『』` → lowercase. Punctuation and spacing changes cannot evade it; rewording can.

**This is not sufficient.** Near-duplicates passed twice in 24 observed turns:

- 「公園の中で特に目を引いた**木**の形や大きさについて教えてください。」 → 「公園の中で特に目を引いた**花**の形や大きさについて…」
- "What did **the pond** look like as you walked past it?" → "What did **the area around the pond** look like as you walked by it?"

Add token-overlap or embedding similarity. Late turns in a well-answered condition drift toward paraphrase, because "ask something not yet asked" has nothing left to reach for.

## The lexical patterns

These detect **explicit cross-condition wording**. A missing keyword is not proof of compliance: a question that stays inside the condition's vocabulary while functionally directing attention elsewhere will pass. Semantic fidelity needs human or model-judge coding on top.

```
odor       匂い|におい|香り|臭い | smell(s|ed)|smelt|scent(s)|odo(u)r(s)|aroma(s)|fragrance(s)
visual     見え|見た|見える|目に入|光景|景色|色|明る|暗|形|光|配置|外見|見た目
           | visual|see|seeing|seen|saw|look(s|ed)|appearance|colo(u)r(s)|brightness|bright|dark|shape(s)|light(s)|arrangement(s)
auditory   音|声|聞こ | auditory|sound(s)|voice(s)|hear|hearing|heard
bodily     触|感触|手触り|温度|湿度|熱|温か|暖か|冷た|冷え|寒|暑|身体|体(に|で|の|が|を|は)|肌|痛|疲れ|緊張
           | bodily|body|touch(ed)|texture(s)|temperature(s)|sensation(s)|warm|cold|hot|pain|tired
emotion    気持ち|考え|感情|気分|どう感じ|どのように感じ|どんな(ことを)?感じ
           | emotion(s)|mood(s)|feeling(s)|thought(s)| how ... feel/felt
sensory    = visual | auditory | bodily | odor | 雰囲気|空気|味|食感|表情 | atmosphere|air|taste|flavo(u)r(s)|expression(s)
no-recall  思い出せ(ません|ない|なかった)|覚えてい(ません|ない)|記憶(が|は)(ありません|ない)|分かりません|分からない|わかりません|わからない|覚えがありません
           | no memory/recall/odour/smell | do(n't)/did(n't)/cannot/can't/could(n't) remember|recall|know
source-inf 原因|なぜ|どうして|推測|想像 | why|guess|infer|imagine|cause(s)|caused
```

Study-disclosure pattern, applied to questions **and** every narrative sentence:
```
条件|仮説|実験|研究|割り?付け|プロンプト | \b(AI|conditions?|hypothes(is|es)|experiments?|research|study|prompts?|instructions?)\b
```
English terms are word-bounded so `said`, `air`, `again` do not trip `AI`. Keep that.

Language matching is a **script** test, not a classifier: `ja` requires a Hiragana/Katakana/Han character; `en` requires a Latin letter and no Japanese characters.

## Known false positives — must be fixed

Single-character matches inside the sensory pattern reject legitimate questions. Verified by running the current validator directly:

| Question | Rejected because of |
|---|---|
| その日は色々なことを話しましたか？ | 色 in 色々 |
| 全体の流れを覚えていますか？ | 体の in 全体の |
| 観光地には行きましたか？ | 光 in 観光 |
| どんな形式で待ち合わせましたか？ | 形 in 形式 |
| 空気を読んで黙っていましたか？ | 空気 (idiom, not air) |

All five hit the **`neutral` branch**, which in a two-condition design is the only escape route when a condition is exhausted. A neutral question that cannot be phrased is a fallback that did not need to happen.

Fix with word-boundary-aware matching or a compound exclusion list (色々・全体・大体・観光・形式・空気を読む). Separately, decide whether 表情 counts as interpersonal event information — it currently reads as sensory.

## Narrative rules

Structural only.

| Violation | Condition |
|---|---|
| schema | sentences is not a list |
| count | fewer than 1 or more than the sentence ceiling (10) |
| item schema | entry is not an object, or carries an unexpected key |
| empty | text missing or blank |
| duplicate sentence | two identical trimmed texts |
| punctuation | not exactly one sentence (JA: count of `。！？!?`; EN: sentence segmentation), or EN text lacking final punctuation |
| disclosure | mentions the study apparatus |
| language mismatch | script does not match the session language |
| annotation schema | creative-addition flag not boolean, or evidence ids not a list of strings |
| duplicate source | repeated id within one sentence |
| unknown source | id outside `fragment` + `answer-1..answer-6` |
| unattributed content | no evidence ids **and** creative-addition false |

The last is the only cross-field rule: content must be claimed either as sourced or as invented, never as neither.

**Everything here is structural. The annotations themselves are never verified against the text** — see the [integrated specification](../../docs/SPEC.md) for the live case where all five English sentences claimed no creative addition while inventing a sunset.

## Retry contract

Validate → on failure record the violations → select from remaining candidates, or repair, or fall back.

- Questions: budget exhausted → **fixed fallback**, session continues.
- Narrative: budget exhausted → **fail the request**. There is no narrative fallback.

Persist every rejected candidate with its violations. Rejection rate per condition is a primary quality metric.
