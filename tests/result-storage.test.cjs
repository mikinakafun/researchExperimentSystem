const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const { resultPayload, generationMetadata } = require('./result-fixtures.cjs');
const { parseResultData } = require('../lib/result-validation.ts');
const { readGenerationMetadata } = require('../lib/generation.ts');
const { createCsvResultStore } = require('../lib/server/csv-result-store.ts');
const { RESULT_CSV_FILENAME, RESULT_CSV_PATH, RESULT_PROTOCOL_VERSION, RESULT_SCHEMA_VERSION } = require('../lib/result-storage.ts');
const { PROMPT_CONFIG } = require('../app/api/prompt-config.ts');

const request = (body) => new Request('http://localhost/api/save-result', { method: 'POST', body: JSON.stringify(body) });
function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'result-storage-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function record(overrides = {}) {
  return { ...parseResultData(resultPayload(overrides)), savedAt: '2026-09-02T00:00:00.000Z', protocolVersion: RESULT_PROTOCOL_VERSION, schemaVersion: RESULT_SCHEMA_VERSION };
}
// Read every field independently of the application's first-column ID scanner.
function rows(csv) {
  const result = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(cell); cell = '';
      if (c === '\n') { result.push(row); row = []; }
    } else cell += c;
  }
  assert.equal(quoted, false);
  const [header, ...data] = result;
  return data.map((values) => {
    assert.equal(values.length, header.length);
    return Object.fromEntries(header.map((key, i) => [key, values[i]]));
  });
}

test('participant ratings require the exact item IDs and integer scores, including when recordType is omitted', () => {
  const valid = resultPayload();
  assert.ok(parseResultData(valid));
  assert.ok(parseResultData({ ...valid, recordType: undefined, language: undefined }));
  for (const field of ['evaluation', 'checks']) {
    const id = Object.keys(valid[field])[0];
    const missing = { ...valid[field] }; delete missing[id];
    for (const ratings of [
      {}, undefined, null, [], missing, { ...missing, unknown: 4 }, { ...valid[field], unknown: 4 },
      ...[0, 8, 1.5, '4', null, true].map((value) => ({ ...valid[field], [id]: value })),
    ]) assert.equal(parseResultData({ ...valid, [field]: ratings }), null, `${field}: ${JSON.stringify(ratings)}`);
    assert.ok(parseResultData({ ...valid, [field]: { ...valid[field], [id]: 1 } }));
    assert.ok(parseResultData({ ...valid, [field]: { ...valid[field], [id]: 7 } }));
  }
});

test('synthetic batches may omit ratings using empty maps, but not submit partial or unknown scales', () => {
  assert.ok(parseResultData(resultPayload({ recordType: 'batch_synthetic', evaluation: {}, checks: {} })));
  assert.ok(parseResultData(resultPayload({ recordType: 'batch_synthetic' })));
  assert.equal(parseResultData(resultPayload({ recordType: 'batch_synthetic', evaluation: { test: 4 } })), null);
  assert.equal(parseResultData(resultPayload({ recordType: 'batch_synthetic', checks: { 'DQ-UNSAID': 7 } })), null);
  assert.equal(parseResultData(resultPayload({ recordType: 'unknown' })), null);
});

test('incomplete or inconsistent generation diagnostics cannot be silently saved', () => {
  const good = generationMetadata();
  assert.deepEqual(readGenerationMetadata({ ...good, question: 'not part of generation metadata' }), good);
  for (const bad of [
    null, {}, { ...good, model: '' }, { ...good, requestId: undefined }, { ...good, source: undefined },
    { ...good, promptVersion: '' }, { ...good, attempts: 0 }, { ...good, attempts: 1.5 },
    { ...good, diagnostics: undefined }, { ...good, attempts: 2 },
    { ...good, fallbackReason: 'generation_rejected' }, { ...good, fallbackReason: 'unknown' },
    { ...good, settings: { ...good.settings, candidateCount: 0 } },
    { ...good, settings: { ...good.settings, repairCount: 1.5 } },
    { ...good, attempts: 2, diagnostics: { rejections: [{ attempt: 3, stage: 'candidate', flags: ['rejected'] }] } },
    { ...good, attempts: 3, diagnostics: { rejections: [{ attempt: 1, stage: 'candidate', flags: ['rejected'] }, { attempt: 1, stage: 'candidate', flags: ['rejected'] }] } },
    { ...good, source: 'fallback' }, { ...good, source: 'fallback', model: 'fallback', requestId: null },
    { ...good, source: 'fallback', model: 'fallback', requestId: null, fallbackReason: 'unknown' },
    { ...good, source: 'generated', requestId: null },
  ]) assert.equal(readGenerationMetadata(bad), null);
  for (const overrides of [
    { questionGeneration: undefined }, { questionGeneration: [] }, { questionGeneration: Array(6).fill(null) },
    { narrativeGeneration: undefined }, { narrativeGeneration: { ...good, promptVersion: 'different-version' } },
    { narrativeGeneration: { ...good, attempts: 4, diagnostics: { rejections: [1, 2, 3].map((attempt) => ({ attempt, flags: ['rejected'] })) } } },
  ]) assert.equal(parseResultData(resultPayload(overrides)), null);
});

test('save route returns 400 for malformed inputs without writing, and retains retry/fallback diagnostics in a new CSV', async (t) => {
  const directory = temporaryDirectory(t);
  const previousCwd = process.cwd();
  let save;
  try { process.chdir(directory); save = require('../app/api/save-result/route.ts').POST; }
  finally { process.chdir(previousCwd); }
  for (const payload of [null, [], 1, 'text', {}, resultPayload({ sessionId: 1 }), resultPayload({ fragment: {} }), resultPayload({ evaluation: {} }), resultPayload({ narrativeGeneration: null })]) {
    assert.equal((await save(request(payload))).status, 400);
  }
  assert.equal((await save(new Request('http://localhost/api/save-result', { method: 'POST', body: '{' }))).status, 400);
  assert.equal(fs.existsSync(path.join(directory, 'data')), false);

  const retry = generationMetadata({ attempts: 2, diagnostics: { rejections: [{ attempt: 1, stage: 'candidate', flags: ['condition_mismatch'], question: '棄却された質問？', metadata: { conditionFocus: 'visual' } }] } });
  const fallback = generationMetadata({ source: 'fallback', fallbackReason: 'generation_rejected', model: 'fallback', requestId: null, attempts: 4, diagnostics: { rejections: [1, 2, 3, 4].map((attempt) => ({ attempt, stage: attempt === 4 ? 'repair' : 'candidate', flags: ['generation_rejected'] })) } });
  const payload = resultPayload({ questionGeneration: [retry, fallback, ...Array.from({ length: 4 }, () => generationMetadata())] });
  fs.mkdirSync(path.join(directory, 'data'));
  const legacy = path.join(directory, 'data/results-v0.4.3-bilingual.csv');
  fs.writeFileSync(legacy, 'legacy stays unchanged\n');
  const response = await save(request(payload));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { saved: true, duplicate: false, language: 'ja', storage: 'csv', path: RESULT_CSV_PATH });
  const csvPath = path.join(directory, RESULT_CSV_PATH);
  const [stored] = rows(fs.readFileSync(csvPath, 'utf8'));
  assert.deepEqual(JSON.parse(stored.question_generation_json), payload.questionGeneration);
  assert.equal(JSON.parse(stored.narrative_generation_json).promptVersion, PROMPT_CONFIG.version);
  assert.deepEqual(JSON.parse(stored.evaluation_json), payload.evaluation);
  assert.equal(stored.schema_version, RESULT_SCHEMA_VERSION);
  assert.equal(stored.prompt_version, payload.narrativePromptVersion);
  assert.equal(fs.readFileSync(legacy, 'utf8'), 'legacy stays unchanged\n');
  const before = fs.readFileSync(csvPath, 'utf8');
  assert.equal((await (await save(request(payload))).json()).duplicate, true);
  assert.equal(fs.readFileSync(csvPath, 'utf8'), before);
});

test('save validator requires generation-kind settings and fallback diagnostics to agree', () => {
  const narrativeSettings = { temperature: PROMPT_CONFIG.narrativeTemperature, candidateCount: 1, repairCount: 0, maxAttempts: PROMPT_CONFIG.maxNarrativeAttempts };
  const narrative = generationMetadata({ promptVersion: PROMPT_CONFIG.version, settings: narrativeSettings });
  assert.ok(parseResultData(resultPayload({ narrativeGeneration: narrative })));
  assert.equal(parseResultData(resultPayload({
    narrativeGeneration: generationMetadata({ promptVersion: PROMPT_CONFIG.version }),
  })), null);

  for (const settings of [
    { temperature: 0.55, candidateCount: 1, repairCount: 0, maxAttempts: 3 },
    { temperature: 0.75, candidateCount: 3, repairCount: 1, maxAttempts: 4 },
    { temperature: 0.55, candidateCount: 3, repairCount: 1, maxAttempts: 3 },
  ]) assert.equal(parseResultData(resultPayload({ questionGeneration: Array.from({ length: 6 }, () => generationMetadata({ settings })) })), null);

  assert.equal(parseResultData(resultPayload({
    questionGeneration: Array.from({ length: 6 }, () => generationMetadata({ source: 'fallback', model: 'fallback', requestId: null, attempts: 4, diagnostics: { rejections: [1, 2, 3, 4].map((attempt) => ({ attempt, stage: 'candidate', flags: ['rejected'] })) } })),
  })), null);
});

test('local adapter serializes concurrent saves and recognizes IDs across multiline quoted content', async (t) => {
  const directory = temporaryDirectory(t);
  const store = createCsvResultStore(directory);
  const payload = record({ sessionId: 'one', answers: ['改行と引用,"言葉"\n"two",に見える回答。', ...Array(5).fill('回答。')] });
  const outcomes = await Promise.all([store.save(payload), store.save(payload), store.save(record({ sessionId: 'two' }))]);
  assert.deepEqual(outcomes, [{ saved: true, duplicate: false }, { saved: false, duplicate: true }, { saved: true, duplicate: false }]);
  const csv = fs.readFileSync(path.join(directory, RESULT_CSV_FILENAME), 'utf8');
  const stored = rows(csv);
  assert.equal(stored.length, 2);
  assert.equal(stored[0].answer_1, payload.answers[0]);
  assert.equal(stored[1].session_id, 'two');
  assert.deepEqual(await store.save(record({ sessionId: 'two' })), { saved: false, duplicate: true });
});

test('failed writes do not poison the queue or append to an incompatible file', async (t) => {
  const directory = temporaryDirectory(t);
  const store = createCsvResultStore(directory);
  const csvPath = path.join(directory, RESULT_CSV_FILENAME);
  fs.writeFileSync(csvPath, 'wrong,header\n');
  await assert.rejects(store.save(record()), /header/);
  assert.equal(fs.readFileSync(csvPath, 'utf8'), 'wrong,header\n');
  fs.unlinkSync(csvPath);
  assert.deepEqual(await store.save(record()), { saved: true, duplicate: false });
});
