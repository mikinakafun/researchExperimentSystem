require('../scripts/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resultPayload } = require('./result-fixtures.cjs');
const { createSupabaseResultStore, supabaseConfig } = require('../lib/server/supabase-result-store.ts');
const { getStorageKind } = require('../lib/server/result-store.ts');
const { RESULT_SCHEMA_VERSION, RESULT_PROTOCOL_VERSION } = require('../lib/result-storage.ts');
const { resultCsvRow } = require('../lib/result-csv.ts');

const config = { url: 'https://offline.supabase.co', secretKey: 'sb_secret_offline_test' };
const record = (overrides = {}) => ({ ...resultPayload(), savedAt: '2026-09-03T00:00:00.000Z', schemaVersion: RESULT_SCHEMA_VERSION, protocolVersion: RESULT_PROTOCOL_VERSION, ...overrides });

function database({ pageCap = 1000, loseFirstResponse = false } = {}) {
  const rows = new Map();
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    assert.equal(options.headers.apikey, config.secretKey);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal);
    assert.equal(url.pathname, '/rest/v1/experiment_results');
    if (options.method === 'POST') {
      const row = JSON.parse(options.body);
      if (rows.has(row.session_id)) return Response.json({ code: '23505', message: 'private database detail' }, { status: 409 });
      rows.set(row.session_id, row);
      if (loseFirstResponse) { loseFirstResponse = false; throw new Error('private transport failure'); }
      return new Response(null, { status: 201 });
    }
    const filter = url.searchParams.get('session_id');
    const matching = [...rows.values()].sort((a, b) => a.session_id < b.session_id ? -1 : 1).filter((row) => {
      if (!filter) return true;
      // Simple eq/gt values are literal text, not JSON-quoted strings.
      const value = filter.slice(3);
      return filter.startsWith('eq.') ? row.session_id === value : row.session_id > value;
    });
    return Response.json(matching.slice(0, Math.min(Number(url.searchParams.get('limit')), pageCap)));
  };
  return { rows, requests, fetcher };
}

test('storage configuration is explicit, rejects browser keys, and never defaults to CSV on Vercel', () => {
  assert.equal(getStorageKind({}), 'csv');
  assert.equal(getStorageKind({ RESULT_STORAGE: 'supabase', VERCEL: '1' }), 'supabase');
  assert.throws(() => getStorageKind({ RESULT_STORAGE: 'supabse' }), /INVALID_RESULT_STORAGE/);
  assert.throws(() => getStorageKind({ VERCEL: '1' }), /CSV_NOT_SUPPORTED/);
  const env = { SUPABASE_URL: config.url, SUPABASE_SECRET_KEY: config.secretKey };
  assert.deepEqual(supabaseConfig(env), config);
  for (const url of ['', 'http://offline.supabase.co', 'https://offline.supabase.co.evil.example', 'https://user@offline.supabase.co', 'https://offline.supabase.co/?secret=x']) {
    assert.throws(() => supabaseConfig({ ...env, SUPABASE_URL: url }), /INVALID_SUPABASE_URL/);
  }
  assert.throws(() => supabaseConfig({ ...env, SUPABASE_SECRET_KEY: 'sb_publishable_example' }), /MISSING_SUPABASE_SECRET_KEY/);
});

test('exact reads send a literal ID as a single URL parameter', async () => {
  const input = record({ sessionId: 'id,with."quotes"\\slash&limit=0+日本語' });
  const store = createSupabaseResultStore(config, async (url) => {
    assert.equal(url.searchParams.get('session_id'), `eq.${input.sessionId}`);
    assert.equal(url.searchParams.get('limit'), '1');
    assert.equal(url.searchParams.getAll('session_id').length, 1);
    return Response.json([{ session_id: input.sessionId, payload: input }]);
  });
  assert.deepEqual(await store.read(input.sessionId), input);
});

test('cloud saves retain all fields, tolerate concurrent retries, and reject different content under one ID', async () => {
  const db = database();
  const store = createSupabaseResultStore(config, db.fetcher);
  const input = record({ sessionId: 'id,with."reserved"\\chars', fragment: '引用,"言葉"\n次の行。' });
  assert.equal(await store.read(input.sessionId), null);
  const outcomes = await Promise.all([store.save(input), store.save(input)]);
  assert.deepEqual(outcomes, [{ saved: true, duplicate: false }, { saved: false, duplicate: true }]);
  assert.deepEqual(await store.read(input.sessionId), input);
  assert.deepEqual(await store.save({ ...input, savedAt: '2026-09-04T00:00:00Z' }), { saved: false, duplicate: true });
  await assert.rejects(store.save({ ...input, condition: 'odor' }), (e) => e.code === 'SESSION_CONFLICT');
  assert.equal(db.rows.size, 1);
  assert.deepEqual(await store.read(input.sessionId), input);
});

test('retry after a lost insert response confirms the existing record without overwriting it', async () => {
  const db = database({ loseFirstResponse: true });
  const store = createSupabaseResultStore(config, db.fetcher);
  const input = record();
  await assert.rejects(store.save(input), (e) => e.code === 'CONNECTION_FAILED');
  assert.deepEqual(await store.save(input), { saved: false, duplicate: true });
  assert.equal(db.rows.size, 1);
});

test('paging exports every record even when the server returns fewer rows than requested', async () => {
  const db = database({ pageCap: 1 });
  const store = createSupabaseResultStore(config, db.fetcher);
  const inputs = ['c', 'a', 'b'].map((sessionId) => record({ sessionId }));
  for (const input of inputs) await store.save(input);
  const output = [];
  for await (const item of store.records(500)) output.push(item);
  assert.deepEqual(output.map((r) => r.sessionId), ['a', 'b', 'c']);
  assert.deepEqual(output.map(resultCsvRow), [inputs[1], inputs[2], inputs[0]].map(resultCsvRow));
  assert.equal(db.requests.filter((r) => r.options.method === 'GET').length, 4);
  assert.deepEqual(db.requests.filter((r) => r.options.method === 'GET').map((r) => r.url.searchParams.get('session_id')), [null, 'gt.a', 'gt.b', 'gt.c']);
  await assert.rejects(async () => { for await (const unused of store.records(0)) void unused; }, /INVALID_PAGE_SIZE/);
});

test('database errors are redacted, not treated as successful duplicates', async () => {
  for (const [code, status] of [['PGRST205', 404], ['42501', 403], ['23514', 400], ['invalid secret contents', 500]]) {
    const store = createSupabaseResultStore(config, async () => Response.json({ code, message: 'private participant content', details: config.secretKey }, { status }));
    await assert.rejects(store.save(record()), (e) => {
      assert.equal(e.message.includes('private'), false);
      assert.equal(e.message.includes(config.secretKey), false);
      assert.equal(e.code, code.startsWith('invalid') ? 'HTTP_500' : code);
      return true;
    });
  }
  const malformed = createSupabaseResultStore(config, async () => Response.json([{ session_id: 'a', payload: { sessionId: 'b' } }]));
  await assert.rejects(malformed.read('a'), /INVALID_RESPONSE/);
});

test('save API uses Supabase, rejects changed consent destination, and reports conflicts without CSV fallback', async (t) => {
  const previousFetch = global.fetch;
  const previousEnv = { ...process.env };
  t.after(() => { global.fetch = previousFetch; process.env = previousEnv; });
  const db = database();
  global.fetch = db.fetcher;
  Object.assign(process.env, { RESULT_STORAGE: 'supabase', SUPABASE_URL: config.url, SUPABASE_SECRET_KEY: config.secretKey });
  const { POST } = require('../app/api/save-result/route.ts');
  const send = (body) => POST(new Request('http://localhost/api/save-result', { method: 'POST', body: JSON.stringify(body) }));
  assert.equal((await send(resultPayload())).status, 409);
  assert.equal((await send({ ...resultPayload(), expectedStorage: 'csv' })).status, 409);
  assert.equal(db.requests.length, 0);
  const body = { ...resultPayload(), expectedStorage: 'supabase' };
  assert.deepEqual(await (await send(body)).json(), { saved: true, duplicate: false, language: 'ja', storage: 'supabase' });
  assert.equal((await (await send(body)).json()).duplicate, true);
  assert.equal((await send({ ...body, fragment: 'different' })).status, 409);
  assert.equal((await send({ ...body, sessionId: 'x'.repeat(201) })).status, 400);
  process.env.RESULT_STORAGE = 'invalid';
  assert.equal((await send(body)).status, 503);
  assert.equal(db.rows.size, 1);
});
