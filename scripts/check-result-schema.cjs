// Optional local SQL check. Uses an isolated, disposable PostgreSQL container.
// Requires Docker and the postgres:16.6 image; no cloud credentials are loaded.
require('./register-typescript.cjs');
const { execFileSync, spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { resultPayload } = require('../tests/result-fixtures.cjs');
const { RESULT_SCHEMA_VERSION, RESULT_PROTOCOL_VERSION } = require('../lib/result-storage.ts');
const name = `research-schema-check-${randomUUID().slice(0, 8)}`;

function query(sql) {
  return spawnSync('docker', ['exec', '-i', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A'], { input: sql, encoding: 'utf8', timeout: 15_000 });
}
function ok(sql) {
  const result = query(sql);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function denied(sql, pattern) {
  const result = query(sql);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, pattern);
}

async function main() {
  let created = false;
  try {
    execFileSync('docker', ['run', '--pull=never', '--rm', '-d', '--name', name, '--network', 'none', '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16.6'], { stdio: 'pipe', timeout: 30_000 });
    created = true;
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      // The initialization server only listens on a socket. Wait for the final TCP listener.
      if (spawnSync('docker', ['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'], { stdio: 'pipe', timeout: 3000 }).status === 0) { ready = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, 'Temporary PostgreSQL did not start.');
    ok('create role anon; create role authenticated; create role service_role bypassrls;');
    ok(readFileSync('supabase/migrations/202609030001_experiment_results.sql', 'utf8'));
    ok(readFileSync('supabase/migrations/202609110001_experiment_results_v3.sql', 'utf8'));
    assert.equal(ok("select relrowsecurity from pg_class where oid='public.experiment_results'::regclass;"), 't');
    const legacy = { ...resultPayload({ sessionId: 'legacy-schema-fixture', recordType: 'batch_synthetic', condition: 'standard' }), savedAt: new Date().toISOString(), schemaVersion: '2', protocolVersion: RESULT_PROTOCOL_VERSION };
    const record = { ...resultPayload({ sessionId: 'schema-fixture', recordType: 'batch_synthetic' }), savedAt: new Date().toISOString(), schemaVersion: RESULT_SCHEMA_VERSION, protocolVersion: RESULT_PROTOCOL_VERSION };
    const legacySerialized = JSON.stringify(legacy).replaceAll("'", "''");
    ok(`set role service_role; insert into public.experiment_results(session_id,payload) values ('legacy-schema-fixture','${legacySerialized}'::jsonb);`);
    const serialized = JSON.stringify(record).replaceAll("'", "''");
    const insert = `insert into public.experiment_results(session_id,payload) values ('schema-fixture','${serialized}'::jsonb);`;
    ok(`set role service_role; ${insert}`);
    assert.equal(ok('set role service_role; select count(*) from public.experiment_results;').split('\n').at(-1), '2');
    assert.match(ok("select record_type || ':' || schema_version from public.experiment_results order by session_id;"), /batch_synthetic:2\nbatch_synthetic:3/u);
    denied(`set role service_role; insert into public.experiment_results(session_id,payload) values ('bad-v3','${JSON.stringify({ ...record, sessionId: 'bad-v3', condition: 'standard' }).replaceAll("'", "''")}'::jsonb);`, /experiment_results_condition_by_schema/u);
    denied(`set role service_role; ${insert}`, /duplicate key/u);
    for (const role of ['anon', 'authenticated']) {
      denied(`set role ${role}; select * from public.experiment_results;`, /permission denied/u);
      denied(`set role ${role}; ${insert}`, /permission denied/u);
    }
    denied("set role service_role; update public.experiment_results set session_id='changed';", /permission denied/u);
    denied('set role service_role; delete from public.experiment_results;', /permission denied/u);
    assert.ok(ok('begin; grant select on public.experiment_results to anon; set role anon; select count(*) from public.experiment_results; rollback;').split('\n').includes('0'));
    denied(`insert into public.experiment_results(session_id,payload) values ('wrong-id','${serialized}'::jsonb);`, /payload_session_matches/u);
    denied('insert into public.experiment_results(session_id,payload) values (\'empty\',\'{}\');', /not-null constraint/u);
    console.log('PASS: PostgreSQL 16.6 migration, generated columns, unique ID, payload constraints, service grants, anonymous/authenticated denial, RLS.');
  } finally {
    if (created) spawnSync('docker', ['rm', '-f', name], { stdio: 'pipe', timeout: 15_000 });
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
