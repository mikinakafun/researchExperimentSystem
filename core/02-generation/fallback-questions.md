# Fallback Questions

Reached when the candidate budget for a turn is exhausted. Their purpose is a hard guarantee: **the session always completes 6 turns.** It never stalls, and it never shortens, because a condition-dependent dropout is worse than a non-uniform stimulus.

These strings are a preserved asset — pre-validated in both languages against the rules in [`validation-rules.md`](validation-rules.md). Reuse them verbatim.

## Selection ladder

1. **Condition-focused question** — used only if the latest answer is *not* a detected non-recall **and** the candidate passes validation. Focus = assigned condition, no transition, no evidence target.
2. Otherwise walk the **neutral ladder in order** and take the first that validates. Focus = `neutral`, no evidence target, and a transition reason.
3. If none validate, that is a hard error. It should be unreachable; if it fires, the validator has become too strict.

Step 1 is genuinely gated, not ceremonial: the `odor` fallback contains 匂い and the `visual` fallback contains 目に入, so each would be rejected under the wrong condition.

Step 2 is stepped **in fixed order every time**, not indexed by turn. Two fallbacks in one session can reach for the same neutral question — the duplicate rule is what pushes the second one further down the ladder. That is how a session with repeated fallbacks still produces six distinct questions.

## Record the reason honestly

Give the fallback its **own** reason field. The current implementation reuses the transition reason and therefore reports "no material left to ask about" when the truth was "generation could not clear the validator" — two different events under one value.

A fixed string also cannot judge whether the participant recalled. It should only claim non-recall when the keyword detector actually fired.

## Improve on the fixed strings

A canned question is the only point in the session that ignores everything the participant said. Observed live, a fallback landed mid-conversation about a park bench and asked a fully generic question.

Two things worth doing: try a **repair** pass before reaching the ladder at all (see [the integrated specification](../../docs/SPEC.md)), and consider a light template that carries the last answer's subject into the fallback text. Any such text must still pass validation.

## Japanese (default)

Condition-focused:

| Condition | Question |
|---|---|
| visual | その時、何か目に入ったものを覚えていますか？ |
| odor | その時、何か匂いを思い出せますか？ |

Neutral ladder, in order:

1. 同じ出来事の中で、ほかに何が起きたか覚えていますか？
2. その時にしていたことを、ほかに覚えていますか？
3. 同じ出来事の別の時点で、何をしていたか覚えていますか？
4. 同じ出来事の中で、行動の順序について覚えていることはありますか？
5. 同じ出来事で、別の場面について覚えていることはありますか？
6. その出来事について、まだ尋ねていないことで覚えていることはありますか？

## English

Condition-focused:

| Condition | Question |
|---|---|
| visual | Do you remember anything you saw at the time? |
| odor | Do you remember any smell at the time? |

Neutral ladder, in order:

1. What else do you remember happening during the same event?
2. What else do you remember doing at the time?
3. What do you remember doing at another point during the same event?
4. What do you remember about the order of actions during the same event?
5. Do you remember another part of the same event?
6. What do you remember about the same event that has not been asked about yet?

> The retired `standard` arm had its own condition-focused fallback (「その出来事の中で、何をしていたか覚えていますか？」 / "What do you remember doing during that event?"). It is dropped with the arm.

## Phrasing rule

Every fallback is *do you remember …?*. It must stay answerable with "no" without implying the detail existed. Any replacement text must keep that property — it is the same principle as the odor source-inference prohibition.

## They are a dose reduction

The neutral ladder is event-structure content. Every neutral fallback moves that session slightly away from its assigned condition. Count fallbacks per session, per condition, and report them with the manipulation checks.
