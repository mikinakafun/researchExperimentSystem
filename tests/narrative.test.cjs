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

const { validateNarrativeSentences } = require('../lib/narrative.ts');
const { POST: generate } = require('../app/api/narrative/route.ts');
const { PROMPT_CONFIG, buildNarrativeInstructions } = require('../app/api/prompt-config.ts');
const answers = Array.from({ length: 6 }, (_, index) => ({
  question: `質問${index + 1}？`, answer: '場所は思い出せませんが、赤い花が見えました。',
}));
const sentences = [
  { text: '友人と公園を歩いた。', sourceIds: ['fragment'], containsCreativeAddition: false },
  { text: '赤い花を見て、足取りが軽くなった。', sourceIds: ['answer-1'], containsCreativeAddition: true },
  { text: '木漏れ日が足元で揺れていた。', sourceIds: [], containsCreativeAddition: true },
];
const validate = (value) => validateNarrativeSentences(value, 6, 10);

test('creative and mixed sentences, including partly recalled material, need no factual evidence', () => {
  assert.deepEqual(validate(sentences), []);
  assert.deepEqual(validate([{ ...sentences[0], sourceIds: ['answer-1'] }]), []);
});

test('creative freedom does not accept invalid attribution, old evidence fields or malformed output', () => {
  const cases = [
    [{ ...sentences[2], containsCreativeAddition: false }, 'unattributed_content'],
    [{ ...sentences[2], sourceIds: ['answer-7'] }, 'unknown_source'],
    [{ ...sentences[2], sourceIds: ['fragment', 'fragment'] }, 'duplicate_source'],
    [{ ...sentences[2], sourceIds: [1] }, 'sources_schema'],
    [{ ...sentences[2], containsCreativeAddition: 'true' }, 'creative_addition_schema'],
    [{ text: '公園を歩いた。', evidenceIds: ['fragment'] }, 'schema'],
    [{ ...sentences[2], text: 'この実験では公園を歩いた。' }, 'disclosure'],
    [{ ...sentences[2], text: '公園を歩いた。花を見た。' }, 'punctuation'],
  ];
  for (const [sentence, flag] of cases) assert.ok(validate([sentence]).some((value) => value.endsWith(flag)), flag);
  assert.ok(validate([sentences[0], { ...sentences[0], text: ` ${sentences[0].text} ` }]).includes('duplicate_sentence'));
  assert.ok(validate([]).includes('sentence_count'));
  assert.ok(validate(Array(11).fill(sentences[0])).includes('sentence_count'));
});

test('API retries invalid annotations and passes creative text through to versioned storage', async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'offline-test';
  t.after(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
  const requests = [];
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const sent = JSON.parse(options.body);
    requests.push(sent);
    const input = JSON.parse(sent.input);
    assert.ok(!('condition' in input));
    assert.ok(!('evidence' in input));
    assert.equal(input.materials.length, 7);
    assert.equal(input.questionContext[0].answerSourceId, 'answer-1');
    const schema = sent.text.format.schema.properties.sentences.items;
    assert.deepEqual(schema.required, ['text', 'sourceIds', 'containsCreativeAddition']);
    assert.equal(schema.properties.sourceIds.minItems, undefined);
    const output = requests.length === 1
      ? [{ ...sentences[2], sourceIds: ['invented-id'] }]
      : sentences;
    return Response.json({ id: 'offline-fixture', model: 'offline-fixture', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ sentences: output }) }] }] });
  });
  const response = await generate(new Request('http://localhost/api/narrative', {
    method: 'POST', body: JSON.stringify({ fragment: '友人と公園を歩いた。', answers }),
  }));
  assert.equal(response.status, 200);
  const generated = await response.json();
  assert.deepEqual(generated.sentences, sentences);
  assert.equal(generated.narrative, sentences.map((sentence) => sentence.text).join(''));
  assert.equal(generated.attempts, 2);
  assert.ok(requests[1].instructions.includes('unknown_source'));
  assert.equal(generated.promptVersion, 'prompt-catalog-v0.4.3-mock-draft');
  assert.ok(!buildNarrativeInstructions().includes('{{'));

  // The save route captures cwd at import; use a temporary directory, never real results.
  const previousCwd = process.cwd();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'creative-narrative-'));
  let save;
  try {
    process.chdir(temporary);
    save = require('../app/api/save-result/route.ts').POST;
  } finally {
    process.chdir(previousCwd);
  }
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const payload = {
    sessionId: 'offline-creative-fixture', recordType: 'batch_synthetic', condition: 'visual',
    fragment: '友人と公園を歩いた。', questions: answers.map((item) => item.question),
    answers: answers.map((item) => item.answer), questionMetadata: Array(6).fill({ conditionFocus: 'visual' }),
    finalResult: generated.narrative, narrativeSentences: generated.sentences,
    narrativePromptVersion: generated.promptVersion, evaluation: { test: 4 }, checks: { 'DQ-UNSAID': 7 },
  };
  const submit = (overrides = {}) => save(new Request('http://localhost/api/save-result', {
    method: 'POST', body: JSON.stringify({ ...payload, ...overrides }),
  }));
  for (const overrides of [
    { narrativePromptVersion: 'prompt-catalog-v0.4.2-mock-draft' },
    { finalResult: '別の文章。' },
    { narrativeSentences: [{ text: '公園を歩いた。', evidenceIds: ['fragment'] }] },
  ]) assert.equal((await submit(overrides)).status, 400);
  const saved = await submit();
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).path, 'data/results-v0.4.3-bilingual.csv');
  assert.equal((await (await submit()).json()).duplicate, true);
  const csv = fs.readFileSync(path.join(temporary, 'data/results-v0.4.3-bilingual.csv'), 'utf8');
  assert.ok(csv.includes('narrative_annotations_json'));
  assert.ok(csv.includes('containsCreativeAddition'));
  assert.ok(csv.includes('v0.4.0-draft'));
  assert.ok(csv.includes(PROMPT_CONFIG.version));
  assert.equal(csv.trim().split('\n').length, 2);
  assert.ok(!fs.existsSync(path.join(temporary, 'data/results-v0.4.2.csv')));
});

test('repeated malformed creative output exhausts the existing three-attempt limit', async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'offline-test';
  t.after(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
  let calls = 0;
  t.mock.method(global, 'fetch', async () => {
    calls++;
    return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ sentences: [] }) }] }] });
  });
  const response = await generate(new Request('http://localhost/api/narrative', {
    method: 'POST', body: JSON.stringify({ fragment: '友人と公園を歩いた。', answers }),
  }));
  assert.equal(response.status, 502);
  assert.equal(calls, 3);
});
