const { test } = require('node:test');
const assert = require('node:assert/strict');

test('persona batch generation metadata preserves settings required by save-result', async () => {
  const { generationMetadata } = await import('../scripts/persona-batch-utils.mjs');
  const payload = {
    model: 'offline-model', requestId: 'offline-response', promptVersion: 'prompt-v1', source: 'generated', attempts: 2,
    settings: { temperature: 0.55, candidateCount: 3, repairCount: 1, maxAttempts: 4 },
    diagnostics: { rejections: [{ attempt: 1, flags: ['condition_mismatch'] }] },
    question: '採用される質問？',
  };
  assert.deepEqual(generationMetadata(payload), {
    model: payload.model,
    requestId: payload.requestId,
    promptVersion: payload.promptVersion,
    source: payload.source,
    attempts: payload.attempts,
    settings: payload.settings,
    diagnostics: payload.diagnostics,
  });

  const fallback = { ...payload, source: 'fallback', fallbackReason: 'generation_rejected', model: 'fallback', requestId: null };
  assert.deepEqual(generationMetadata(fallback), {
    model: 'fallback', requestId: null, promptVersion: payload.promptVersion, source: 'fallback',
    fallbackReason: 'generation_rejected', attempts: payload.attempts, settings: payload.settings, diagnostics: payload.diagnostics,
  });
});
