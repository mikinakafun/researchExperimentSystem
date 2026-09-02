require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { createSupabaseResultStore, ResultStorageError } = require('../lib/server/supabase-result-store.ts');
const { parseResultData } = require('../lib/result-validation.ts');
const { RESULT_SCHEMA_VERSION, RESULT_PROTOCOL_VERSION } = require('../lib/result-storage.ts');
const { resultCsvHeader, resultCsvRow } = require('../lib/result-csv.ts');
const { resultPayload } = require('../tests/result-fixtures.cjs');

async function main() {
  const store = createSupabaseResultStore();
  const sessionId = `supabase-check-${randomUUID()}`;
  // Probe the table before writing. This script never calls OpenAI.
  assert.equal(await store.read(sessionId), null);
  const data = parseResultData(resultPayload({
    sessionId, recordType: 'batch_synthetic', evaluation: {}, checks: {},
    fragment: '接続検証用の架空の出来事：友人と公園を歩いた。',
  }));
  assert.ok(data);
  const record = { ...data, savedAt: new Date().toISOString(), schemaVersion: RESULT_SCHEMA_VERSION, protocolVersion: RESULT_PROTOCOL_VERSION };
  const outcomes = await Promise.all([store.save(record), store.save(record)]);
  assert.equal(outcomes.filter((item) => item.saved).length, 1);
  assert.equal(outcomes.filter((item) => item.duplicate).length, 1);
  assert.deepEqual(await store.read(sessionId), record);
  assert.deepEqual(await store.save({ ...record, savedAt: new Date().toISOString() }), { saved: false, duplicate: true });
  await assert.rejects(store.save({ ...record, fragment: 'Different synthetic input.' }), (error) => error.code === 'SESSION_CONFLICT');
  assert.deepEqual(await store.read(sessionId), record);
  await mkdir('data', { recursive: true });
  const output = path.join('data', `${sessionId}.csv`);
  await writeFile(output, `${resultCsvHeader}\n${resultCsvRow(await store.read(sessionId))}\n`, { flag: 'wx', mode: 0o600 });
  console.log('PASS: synthetic insert, concurrent duplicate prevention, read-back, conflict rejection, CSV export.');
  console.log(`Synthetic record retained: ${sessionId}`);
  console.log(`CSV: ${output}`);
}

main().catch((error) => {
  console.error(error instanceof ResultStorageError ? error.message : 'Supabase verification failed.');
  if (error instanceof ResultStorageError && ['PGRST205', '42P01'].includes(error.code)) {
    console.error('Run supabase/migrations/202609030001_experiment_results.sql in the SQL Editor of 26labResearch, then retry.');
  }
  process.exitCode = 1;
});
