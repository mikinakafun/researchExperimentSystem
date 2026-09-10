// Explicit live API check: three conditions, two questions each, synthetic data.
// Start the app first. Does not call narrative/save-result or write participant CSVs.
import { writeFile } from 'node:fs/promises';

const baseUrl = process.env.MOCK_BASE_URL || 'http://127.0.0.1:3187';
const fragment = '先週の日曜日、友人と公園を歩き、花壇のそばのベンチで休んだ。';
const answers = {
  standard: '友人と公園を歩いた後、花壇のそばのベンチに座って休みました。',
  visual: '赤い花と白いベンチです。',
  odor: '花壇のそばで甘い花の香りを覚えています。',
};

async function run(condition) {
  const history = [];
  const rows = [];
  for (let turn = 1; turn <= 2; turn++) {
    const request = { condition, fragment, history: [...history], turn };
    const response = await fetch(`${baseUrl}/api/follow-up`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request), signal: AbortSignal.timeout(300_000),
    });
    const body = await response.json();
    rows.push({ request, status: response.status, response: body });
    console.log(JSON.stringify({ condition, turn, status: response.status, question: body.question, source: body.source, attempts: body.attempts, rejections: body.diagnostics?.rejections, error: body.error }));
    if (!response.ok) break;
    if (body.promptVersion !== 'prompt-catalog-v0.4.2-mock-draft') throw new Error('Wrong prompt version: ' + body.promptVersion);
    history.push({ question: body.question, answer: answers[condition], metadata: body.metadata });
  }
  return rows;
}

const results = await Promise.allSettled(Object.keys(answers).map(run));
const rows = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
const errors = results.filter(result => result.status === 'rejected').map(result => String(result.reason));
const summary = {
  at: new Date().toISOString(), generated: rows.filter(row => row.response.source === 'generated').length,
  fallback: rows.filter(row => row.response.source === 'fallback').length,
  attempts: rows.reduce((sum, row) => sum + (row.response.attempts || 0), 0),
  completed: rows.length, errors,
};
await writeFile(new URL('live-results.json', import.meta.url), JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log(JSON.stringify(summary));
if (errors.length || rows.length !== 6 || rows.some(row => row.status !== 200)) process.exitCode = 1;
