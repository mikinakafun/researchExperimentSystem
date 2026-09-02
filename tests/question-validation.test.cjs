const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Run the real TypeScript modules using the existing compiler dependency.
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const { validateQuestion } = require('../app/api/question-validation.ts');
const { POST } = require('../app/api/follow-up/route.ts');
const { buildFollowUpInstructions } = require('../app/api/prompt-config.ts');

function input(question, overrides = {}) {
  return {
    condition: 'visual', turn: 1, fragment: '友人と公園を歩いた。', history: [], question,
    ...overrides,
    metadata: {
      conditionFocus: overrides.condition ?? 'visual', turnFunction: 'broad_recall',
      targetEvidenceId: null, nonRecallTransition: false, insufficientEvidenceTransition: false,
      ...overrides.metadata,
    },
  };
}

test('natural openings, punctuation, conjunctions, salience and length do not force fallback', () => {
  for (const question of [
    '公園で、何か見えたものを覚えていますか？',
    '花壇について覚えていることを教えてください。',
    '一番はっきり覚えている見た目はありますか？',
    '印象に残った花はありますか？',
    '赤い花または白いベンチについて、覚えていることはありますか？',
    '花の見た目は覚えていますか？ベンチはどうでしたか？',
    '友人と公園を歩いていた場面の中で、途中で休んだ花壇のそばにあるベンチに腰を下ろしていた時のことについて、もし覚えている範囲で何かあれば、その場で見えたものを教えていただけますか？',
  ]) assert.deepEqual(validateQuestion(input(question)), [], question);
});

test('each condition can use contextual wording without a required keyword', () => {
  for (const condition of ['standard', 'visual', 'odor']) {
    assert.deepEqual(validateQuestion(input('ほかに覚えていることはありますか？', { condition })), []);
  }
});

test('evidence does not need a sensory keyword, can be reused, or be null', () => {
  const history = Array.from({ length: 4 }, (_, i) => ({
    question: `以前の質問${i + 1}？`, answer: '赤い花と白いベンチです。',
    metadata: { targetEvidenceId: 'answer-1' },
  }));
  for (const targetEvidenceId of ['fragment', 'answer-1', null]) {
    assert.deepEqual(validateQuestion(input('その花の見た目を教えてください。', {
      turn: 5, history, metadata: { turnFunction: 'grounded_detail', targetEvidenceId },
    })), []);
  }
});

test('neutral transition is allowed before turn five, without requiring a specific event word', () => {
  assert.deepEqual(validateQuestion(input('ほかに覚えていることはありますか？', {
    turn: 2, history: [{ question: '何か覚えていますか？', answer: '特にありません。' }],
    metadata: { conditionFocus: 'neutral', insufficientEvidenceTransition: true },
  })), []);
});

test('partly recalled answers remain available as evidence', () => {
  assert.deepEqual(validateQuestion(input('その花の見た目を教えてください。', {
    turn: 2, history: [{ question: '何か見えましたか？', answer: '場所は思い出せませんが、赤い花が見えました。' }],
    metadata: { turnFunction: 'grounded_detail', targetEvidenceId: 'answer-1' },
  })), []);
});

test('condition contamination and odor source inference are still rejected', () => {
  const cases = [
    ['standard', '何色でしたか？', 'standard_sensory_contamination'],
    ['standard', 'その出来事の後、どのように感じましたか？', 'standard_emotion_focus'],
    ['standard', '公園を歩いた時、友人とどんなことを感じましたか？', 'standard_emotion_focus'],
    ['visual', 'どんな匂いでしたか？', 'visual_odor_contamination'],
    ['visual', '何か音を覚えていますか？', 'visual_condition_contamination'],
    ['odor', '何色でしたか？', 'odor_condition_contamination'],
    ['odor', '匂いの原因を想像できますか？', 'odor_source_inference'],
    ['odor', 'その甘い花の香りは、どのような花から感じられましたか？', 'odor_source_inference'],
  ];
  for (const [condition, question, flag] of cases) {
    assert.ok(validateQuestion(input(question, { condition })).includes(flag), question);
  }
  assert.deepEqual(validateQuestion(input('その匂いは、どの時点から覚えていますか？', { condition: 'odor' })), []);
  assert.ok(validateQuestion(input('何か匂いを覚えていますか？', {
    metadata: { conditionFocus: 'neutral', nonRecallTransition: true },
  })).includes('neutral_focus_contamination'));
});

test('disclosure, normalized duplicates and empty output are still rejected', () => {
  assert.ok(validateQuestion(input('この実験では何が見えましたか？')).includes('study_disclosure'));
  assert.ok(validateQuestion(input(' 花の見た目は？ ', {
    turn: 2, history: [{ question: '花の見た目は?', answer: '赤でした。' }],
  })).includes('duplicate'));
  assert.ok(validateQuestion(input('  ')).includes('empty'));
});

test('output metadata remains valid and consistent with the assigned condition', () => {
  const cases = [
    [{ conditionFocus: 'odor' }, 'condition_focus_mismatch'],
    [{ conditionFocus: 'unknown' }, 'invalid_condition_focus'],
    [{ turnFunction: 'unknown' }, 'invalid_turn_function'],
    [{ targetEvidenceId: 'answer-99' }, 'invalid_target_evidence_id'],
    [{ nonRecallTransition: true, insufficientEvidenceTransition: true }, 'multiple_transitions'],
    [{ conditionFocus: 'neutral' }, 'neutral_without_transition'],
  ];
  for (const [metadata, flag] of cases) assert.ok(validateQuestion(input('花を覚えていますか？', { metadata })).includes(flag), flag);
});

test('all prompt branches render without requiring a fixed opening', () => {
  for (const condition of ['standard', 'visual', 'odor']) {
    for (let turn = 1; turn <= 6; turn++) {
      for (const nonRecall of [true, false]) {
        const instructions = buildFollowUpInstructions(condition, turn, nonRecall);
        assert.ok(!instructions.includes('{{'));
        assert.ok(instructions.includes('必須ではありません'));
        assert.ok(!instructions.includes('80文字以内'));
      }
    }
  }
});

test('API uses relaxed generated questions, records rejected candidates, and preserves fallback', async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'offline-test';
  t.after(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
  const request = () => new Request('http://localhost/api/follow-up', {
    method: 'POST', body: JSON.stringify({ condition: 'visual', turn: 1, fragment: '友人と公園を歩いた。', history: [] }),
  });
  const valid = input('公園で覚えているものを教えてください。');
  let output = { question: valid.question, ...valid.metadata };
  let calls = 0;
  t.mock.method(global, 'fetch', async (url) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    calls++;
    return Response.json({ id: 'offline-fixture', model: 'offline-fixture', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
  });
  let response = await POST(request());
  let body = await response.json();
  assert.equal(body.source, 'generated');
  assert.equal(body.question, valid.question);
  assert.equal(calls, 1);

  output = { ...output, question: 'どんな匂いでしたか？' };
  calls = 0;
  response = await POST(request());
  body = await response.json();
  assert.equal(body.source, 'fallback');
  assert.equal(calls, 3);
  assert.equal(body.diagnostics.rejections[0].question, output.question);
  assert.equal(body.diagnostics.rejections[0].metadata.conditionFocus, 'visual');

  output = { ...output, question: valid.question, nonRecallTransition: 'false' };
  response = await POST(request());
  body = await response.json();
  assert.equal(body.source, 'fallback');
  assert.ok(body.diagnostics.rejections[0].flags.includes('non_recall_transition_schema'));
});
