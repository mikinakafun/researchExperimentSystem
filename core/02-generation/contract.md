# Generation Contract

What flows in and out of each generation step, and what must be recorded. **Transport-independent** — HTTP routes, RPC, a queue, or in-process calls are all fine. The current implementation's shapes appear at the end as one reference instance, not as a requirement.

Three operations: **generate a question**, **generate a narrative**, **save a result**.

## Question generation

**In**

| | |
|---|---|
| condition | `visual` \| `odor` |
| turn | 1..6 |
| fragment | non-empty |
| history | every prior question/answer, all non-empty |
| language | `ja` \| `en` |

**Consistency requirement:** history length must equal `turn - 1`, and a violation must be rejected before any model call. Turn 1 carries an empty history. This is what makes evidence ids well-defined — it guarantees `answer-N` exists for every N the model could cite.

**Out**

| | |
|---|---|
| question | the text shown to the participant |
| conditionFocus | assigned condition, or `neutral` |
| targetEvidenceId | evidence id, or null |
| transition reason | absent, or exactly one of *non-recall* / *no material* |
| generation record | see below |

**Never fails for validation reasons.** Budget exhausted means a fallback, not an error.

## Narrative generation

**In:** fragment, exactly 6 question/answer pairs, language.
**Out:** the joined narrative text, the sentence list with per-sentence annotations, and a generation record.

**Fails when the budget is exhausted.** There is no narrative fallback — a fabricated story could not be attributed to a prompt version.

## The generation record

Attached to every generated artifact and **persisted with the result**. This is the part most likely to be dismissed as logging. It is not: rejection rate per condition is how the study knows whether its manipulation is sustainable.

| Field | Purpose |
|---|---|
| model | the model that actually answered — resolve and record the concrete version, not the alias you requested |
| request id | provider correlation, null for a fallback |
| prompt version | which prompt produced this |
| source | generated or fallback |
| attempts | candidates consumed |
| rejections | every rejected candidate: its violations, its text, its metadata |
| fallback reason | **new** — why the fallback was reached, separate from the transition reason |

**Re-validate this record on the receiving side**, before it is displayed or saved. Rejections must be contiguous and internally consistent, and a fallback record must be recognisable as one. The principle: *missing diagnostics must never be able to masquerade as a clean first-attempt success.* A silently-empty rejection history would understate the very thing being measured.

## Save

**In:** the complete session — condition, language, fragment, 6 questions with metadata and generation records, 6 answers, narrative with annotations and generation record, all 18 ratings, a session id, and the destination the participant consented to.

**Rejections that must exist:**

- malformed or incomplete payload;
- **destination mismatch** — the consented destination disagrees with the server's current setting. Refuse; never redirect. See [`recording-and-storage.md`](../04-storage/recording-and-storage.md);
- **id conflict** — same session id, different content.

A byte-identical re-submit under the same id is an idempotent success, not an error.

## Provider call requirements

- Key read **server-side only**. It must never be reachable from the browser.
- Opt out of provider-side retention.
- Bounded timeout, and a distinguishable timeout outcome.
- Constrain the output shape at the call (strict JSON schema or equivalent) **and** re-check after parsing. Tolerate a fenced code block around JSON.
- Do not echo provider error text to the client. Auth failures in particular must not reveal key state.
- Auth, quota, and service-unavailable failures **abort** rather than consuming the candidate budget and degrading to a fallback.

## Reference: the current implementation

One instance of the above. Do not treat it as the specification.

```
POST /api/follow-up
  → { question, metadata{conditionFocus, turnFunction, targetEvidenceId,
                         nonRecallTransition, insufficientEvidenceTransition},
      language, model, requestId, promptVersion, source, attempts,
      diagnostics: { rejections: [...] } }
  400 "Invalid follow-up request."

POST /api/narrative
  → { narrative, sentences[{text, sourceIds, containsCreativeAddition}],
      language, model, requestId, promptVersion, source, attempts, diagnostics }
  400 "Invalid narrative request."

POST /api/save-result
  → { saved, duplicate, language, storage, path? }
  400 malformed · 409 destination mismatch or id conflict · 503 storage failure
```

Two known defects in this instance, both fixed by the requirements above:

- `turnFunction` is carried but never enforced or read — **dropped** in the rebuild ([`DESIGN.md`](../DESIGN.md) §5).
- Every request-validation failure collapses into one opaque string, so a caller cannot tell a bad `turn` from a mismatched history length without re-deriving the rule. Say which field failed.
