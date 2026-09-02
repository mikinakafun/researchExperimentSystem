require('./register-typescript.cjs');
const { mkdir, open, unlink } = require('node:fs/promises');
const path = require('node:path');
const { createSupabaseResultStore, ResultStorageError } = require('../lib/server/supabase-result-store.ts');
const { resultCsvHeader, resultCsvRow } = require('../lib/result-csv.ts');

async function main() {
  const args = process.argv.slice(2);
  let recordType = 'participant';
  let output = path.join('data', `supabase-results-${new Date().toISOString().replace(/[:.]/gu, '-')}.csv`);
  while (args.length) {
    const arg = args.shift();
    if (arg === '--record-type' && args[0]) recordType = args.shift();
    else if (arg === '--output' && args[0]) output = args.shift();
    else throw new Error('Invalid arguments.');
  }
  if (!['participant', 'batch_synthetic', 'all'].includes(recordType)) throw new Error('Invalid record type.');
  const store = createSupabaseResultStore();
  await mkdir(path.dirname(output), { recursive: true });
  const file = await open(output, 'wx', 0o600);
  let count = 0;
  try {
    await file.writeFile(`${resultCsvHeader}\n`);
    for await (const record of store.records()) {
      if (recordType !== 'all' && record.recordType !== recordType) continue;
      await file.writeFile(`${resultCsvRow(record)}\n`);
      count++;
    }
    await file.close();
  } catch (error) {
    await file.close().catch(() => {});
    await unlink(output).catch(() => {});
    throw error;
  }
  console.log(`Exported ${count} records (${recordType}) to ${output}`);
}

main().catch((error) => {
  console.error(error instanceof ResultStorageError ? error.message : 'CSV export failed. Check arguments and choose a new writable output path.');
  process.exitCode = 1;
});
