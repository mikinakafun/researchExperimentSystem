# Recording and Storage

**Inherited.** The two storage modes and the consent lock were settled and work; keep them. How you implement the interface is yours.

## What must be recorded per session

| Group | Fields |
|---|---|
| identity | session id (stable, unique), record type (`participant` \| `synthetic`) |
| assignment | condition, language |
| input | initial fragment |
| questions | 6 texts, 6 metadata objects, 6 generation records |
| answers | 6 texts |
| narrative | joined text, sentence list with annotations, generation record |
| ratings | 12 outcome + 6 check, by stable item id |
| provenance | saved-at, schema version, protocol version, **prompt version** |

`synthetic` records come from the harness ([`evaluation-harness.md`](../05-verification/evaluation-harness.md)) and may omit ratings entirely — but not partially. **Always filter on record type before analysing.** One storage path for both keeps the harness exercising the real code; the type field keeps them separable.

## Consistency gates at save time

Validate on the receiving side, not only in the client. These are not type checks — they refuse records that could not be interpreted later.

1. **Arrays are exactly the turn count.** Six questions, six answers, six metadata, six generation records.
2. **Prompt version matches the current one exactly.** A prompt change makes older results unwritable rather than silently mixed into one file.
3. **Narrative annotations re-pass their structural rules** ([`validation-rules.md`](../02-generation/validation-rules.md)).
4. **Joining the annotated sentences reproduces the displayed text.** The rated text must be reconstructible from what was stored; a rated narrative can never drift from its annotations.
5. **Every generation record is internally consistent** and within the candidate budget.
6. **The narrative record is not a fallback** — there is no narrative fallback, so such a record is by definition corrupt.
7. **Ratings carry exactly the expected id sets**, integers 1–7.

## Two modes, one interface

Selected by configuration. An unrecognised value is a startup error, not a default.

**Local file** — append-only, single-process, for local piloting. Serialise writes. Refuse to append if the existing file's schema does not match the current one. Detect duplicate session ids with a **quote-aware** scan: answers contain newlines and commas, and a naive line split will corrupt the check.

**Cloud database** — for real collection and concurrent participants. Validate the endpoint configuration strictly (scheme, host suffix, no credentials or query in the URL) and reject a client-side/anon key — a server-secret key is required. On a unique-violation, re-read and return an idempotent success **only if every field except the timestamp is deep-equal**; otherwise a conflict. Paginate exports by cursor and fail loudly rather than looping if the cursor stops advancing.

**Never fall back from one mode to the other.** A failure in the configured destination is a failure.

## The consent–destination lock

The client sends the destination it consented to. If that disagrees with the server's current setting, **refuse the save**.

This is a research-ethics control expressed as a mechanism: the consent screen names the destination in plain language, so a participant who agreed to "local file" must never be silently written to the cloud because a configuration value changed mid-session. Reject; do not redirect, and do not repair.

## Error handling

Reduce storage errors to a code, log it server-side, and return a single generic message. No URLs, headers, credentials, database details, or answer text may reach the client.

## Idempotency

A byte-identical re-submit under the same session id is a success that wrote nothing. Different content under the same id is a conflict. This is what lets the synthetic harness re-run safely with deterministic ids.

## Privacy

Fragment input is capped at 100 characters with a warning against identifiers, but there is **no automated PII scrubbing**. Free text is identifiable — handle the store accordingly. The model API key is server-side only; provider calls opt out of retention.

## Reference: the current column layout

One instance. Reproduce the *content*, not necessarily the shape.

```
session_id, record_type, saved_at, schema_version, protocol_version, prompt_version,
condition, language, initial_fragment,
question_1 … question_6,
answer_1 … answer_6,
question_metadata_json, question_generation_json,
final_result, narrative_annotations_json, narrative_generation_json,
evaluation_json, checks_json
```

Note `prompt_version` here holds the **narrative** prompt version; the question prompt version lives inside the per-question generation records. If you keep one flat column, make it unambiguous which version it is — or record both explicitly.

## Operating commands — inherited

```bash
npm run check:supabase        # verify cloud configuration and connectivity
npm run check:result-schema   # validate a result payload against the schema
npm run export:supabase       # page all cloud records out to a file
```
