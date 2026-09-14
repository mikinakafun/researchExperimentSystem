const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};

const { validateQuestion } = require('../app/api/question-validation.ts');
const { POST } = require('../app/api/follow-up/route.ts');
const { buildFollowUpInstructions, PROMPT_CONFIG } = require('../app/api/prompt-config.ts');
const { fallbackQuestion } = require('../app/api/fallback-questions.ts');

function input(question, overrides = {}) {
  const condition = overrides.condition ?? 'visual';
  return {
    condition, turn: 1, fragment: '友人と公園を歩いた。', history: [], question,
    ...overrides,
    metadata: {
      conditionFocus: condition, targetEvidenceId: 'fragment', transitionReason: null,
      ...overrides.metadata,
    },
  };
}

test('visual and odor questions allow natural wording without requiring a keyword', () => {
  for (const question of [
    '公園で、何か見えたものを覚えていますか？',
    '花壇について覚えていることを教えてください。',
    '一番はっきり覚えている見た目はありますか？',
    '印象に残った花はありますか？',
    '赤い花または白いベンチについて、覚えていることはありますか？',
    '花の見た目は覚えていますか？ベンチはどうでしたか？',
    '友人と公園を歩いていた場面の中で、途中で休んだ花壇のそばにあるベンチに腰を下ろしていた時のことについて、もし覚えている範囲で何かあれば、その場で見えたものを教えていただけますか？',
  ]) assert.deepEqual(validateQuestion(input(question)), [], question);
  for (const condition of ['visual', 'odor']) {
    assert.deepEqual(validateQuestion(input('ほかに覚えていることはありますか？', { condition })), []);
  }
  assert.deepEqual(validateQuestion(input('その甘い香りは、どのような花の匂いだったか覚えていますか？', { condition: 'odor' })), []);
});

test('known evidence may be reused, including partly recalled answers', () => {
  const history = Array.from({ length: 4 }, (_, index) => ({
    question: `以前の質問${index + 1}？`, answer: '赤い花と白いベンチです。',
    metadata: { conditionFocus: 'visual', targetEvidenceId: 'answer-1', transitionReason: null },
  }));
  for (const targetEvidenceId of ['fragment', 'answer-1']) {
    assert.deepEqual(validateQuestion(input('その花の見た目を教えてください。', {
      turn: 5, history, metadata: { targetEvidenceId },
    })), []);
  }
  assert.deepEqual(validateQuestion(input('その花の見た目を教えてください。', {
    turn: 2,
    history: [{ question: '何か見えましたか？', answer: '場所は思い出せませんが、赤い花が見えました。' }],
    metadata: { targetEvidenceId: 'answer-1' },
  })), []);
});

test('word boundaries avoid false positives and detect actual cross-condition wording', () => {
  for (const question of ['色々なことを覚えていますか？', '全体について覚えていますか？', '観光について覚えていますか？', '形式について覚えていますか？', '空気について覚えていますか？']) {
    assert.deepEqual(validateQuestion(input(question, { condition: 'visual' })), []);
  }
  assert.ok(validateQuestion(input('どんな匂いでしたか？', { condition: 'visual' })).includes('visual_odor_contamination'));
  assert.ok(validateQuestion(input('何色でしたか？', { condition: 'odor', metadata: { conditionFocus: 'odor' } })).includes('odor_condition_contamination'));
  assert.ok(validateQuestion(input('匂いの原因を想像できますか？', { condition: 'odor' })).includes('odor_source_inference'));
  assert.deepEqual(validateQuestion(input('その匂いは、どの時点から覚えていますか？', { condition: 'odor' })), []);
  assert.deepEqual(validateQuestion(input('その甘い香りは、どのような花の匂いだったか覚えていますか？', { condition: 'odor' })), []);
  assert.ok(validateQuestion(input('何か匂いを覚えていますか？', {
    metadata: { conditionFocus: 'neutral', targetEvidenceId: null, transitionReason: 'non_recall' },
  })).includes('neutral_focus_contamination'));
});

test('near-duplicate questions are rejected in addition to exact duplicates', () => {
  const history = [{ question: 'その花の見た目を教えてください。', answer: '赤でした。' }];
  assert.ok(validateQuestion(input('その花の見た目を教えて下さい。', { turn: 2, history })).includes('near_duplicate'));
  assert.ok(validateQuestion(input('その花の見た目を教えてください。', { turn: 2, history })).includes('duplicate'));
});

test('metadata uses one independent transition reason and valid evidence IDs', () => {
  assert.deepEqual(validateQuestion(input('ほかに覚えていることはありますか？', {
    turn: 2, history: [{ question: '何か見えましたか？', answer: '特にありません。' }],
    metadata: { conditionFocus: 'neutral', targetEvidenceId: null, transitionReason: 'insufficient_evidence' },
  })), []);
  assert.ok(validateQuestion(input('その花を見ましたか？', { metadata: { transitionReason: 'non_recall' } })).includes('focused_question_with_transition'));
  assert.ok(validateQuestion(input('その花を見ましたか？', { metadata: { targetEvidenceId: 'answer-99' } })).includes('invalid_target_evidence_id'));
  assert.ok(validateQuestion(input('その花を見ましたか？', { metadata: { turnFunction: 'broad_recall' } })).includes('obsolete_metadata'));
  for (const [metadata, flag] of [
    [{ conditionFocus: 'odor' }, 'condition_focus_mismatch'],
    [{ conditionFocus: 'unknown' }, 'invalid_condition_focus'],
    [{ transitionReason: 'unknown' }, 'invalid_transition_reason'],
    [{ targetEvidenceId: 'answer-99' }, 'invalid_target_evidence_id'],
    [{ conditionFocus: 'neutral', targetEvidenceId: null, transitionReason: null }, 'neutral_without_transition'],
  ]) assert.ok(validateQuestion(input('花を覚えていますか？', { metadata })).includes(flag), flag);
});

test('disclosure, normalized duplicates, and empty output remain rejected', () => {
  assert.ok(validateQuestion(input('この実験では何が見えましたか？')).includes('study_disclosure'));
  assert.ok(validateQuestion(input(' 花の見た目は？ ', {
    turn: 2, history: [{ question: '花の見た目は?', answer: '赤でした。' }],
  })).includes('duplicate'));
  assert.ok(validateQuestion(input('  ')).includes('empty'));
});

test('all two-condition prompt branches render without a fixed turn function', () => {
  for (const condition of ['visual', 'odor']) {
    for (let turn = 1; turn <= 6; turn += 1) {
      for (const nonRecall of [true, false]) {
        const instructions = buildFollowUpInstructions(condition, turn, nonRecall, 'test_retry');
        assert.ok(!instructions.includes('{{'));
        assert.ok(!instructions.includes('turnFunction'));
        assert.ok(instructions.includes('transitionReason'));
      }
    }
  }
});

test('prompt guidance remains independent of turn position and language', () => {
  for (const language of ['ja', 'en']) {
    for (const condition of ['visual', 'odor']) {
      for (const nonRecall of [false, true]) {
        const first = buildFollowUpInstructions(condition, 1, nonRecall, undefined, language);
        for (let turn = 2; turn <= 6; turn += 1) {
          assert.equal(buildFollowUpInstructions(condition, turn, nonRecall, undefined, language), first);
        }
        assert.ok(!first.includes('80文字以内'));
        assert.ok(!first.includes('turnFunction'));
      }
    }
  }
});

test('fallback preserves condition focus until non-recall or material exhaustion', () => {
  const fragment = '友人と公園にいた。';
  const first = fallbackQuestion({ condition: 'visual', turn: 1, fragment, history: [], language: 'ja' });
  assert.equal(first.question, 'その時、何か目に入ったものを覚えていますか？');
  assert.deepEqual(first.metadata, { conditionFocus: 'visual', targetEvidenceId: 'fragment', transitionReason: null });

  const ordinaryHistory = Array.from({ length: 4 }, (_, index) => ({ question: `質問${index + 1}？`, answer: fragment }));
  const ordinary = fallbackQuestion({ condition: 'visual', turn: 5, fragment, history: ordinaryHistory, language: 'ja' });
  assert.equal(ordinary.metadata.conditionFocus, 'visual');
  assert.equal(ordinary.metadata.targetEvidenceId, 'answer-4');
  assert.equal(ordinary.metadata.transitionReason, null);

  const nonRecall = fallbackQuestion({ condition: 'visual', turn: 5, fragment, history: [...ordinaryHistory.slice(0, 3), { question: '質問4？', answer: '思い出せません。' }], language: 'ja' });
  assert.equal(nonRecall.metadata.conditionFocus, 'neutral');
  assert.equal(nonRecall.metadata.transitionReason, 'non_recall');
});

test('fixed fallbacks complete six turns in both languages', () => {
  for (const language of ['ja', 'en']) {
    for (const condition of ['visual', 'odor']) {
      const history = [];
      for (let turn = 1; turn <= 6; turn += 1) {
        const fragment = language === 'ja' ? '友人と公園にいた。' : 'I was at a park with a friend.';
        const candidate = fallbackQuestion({ condition, turn, fragment, history, language });
        assert.deepEqual(validateQuestion({ condition, turn, fragment, history, language, ...candidate }), []);
        assert.equal(Object.hasOwn(candidate.metadata, 'turnFunction'), false);
        history.push({ question: candidate.question, answer: turn === 3 ? '思い出せません。' : '公園にいました。', metadata: candidate.metadata });
      }
      assert.equal(history.length, 6);
    }
  }
});

test('API accepts the new metadata contract and keeps complete history', async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'offline-test';
  t.after(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
  const history = [{ question: '何か見えましたか？', answer: '赤い花が見えました。', metadata: { conditionFocus: 'visual', targetEvidenceId: 'fragment', transitionReason: null } }];
  const output = { question: 'その赤い花について、ほかに覚えている見た目はありますか？', conditionFocus: 'visual', targetEvidenceId: 'answer-1', transitionReason: null };
  let sentInput;
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    sentInput = JSON.parse(JSON.parse(options.body).input);
    return Response.json({ id: 'offline-fixture', model: 'offline-fixture', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
  });
  const response = await POST(new Request('http://localhost/api/follow-up', {
    method: 'POST', body: JSON.stringify({ language: 'ja', condition: 'visual', turn: 2, fragment: '友人と公園を歩いた。', history }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, 'generated');
  assert.deepEqual(body.metadata, { conditionFocus: output.conditionFocus, targetEvidenceId: output.targetEvidenceId, transitionReason: output.transitionReason });
  assert.deepEqual(sentInput.previousTurns, history);
});

test('API forwards all prior evidence and accepts the selected language', async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'offline-test';
  t.after(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
  const history = Array.from({ length: 5 }, (_, index) => ({
    question: `Earlier question ${index + 1}?`, answer: 'I remember red flowers, but not the place.',
  }));
  const output = { question: 'At what point did you see those flowers?', conditionFocus: 'visual', targetEvidenceId: 'answer-1', transitionReason: null };
  let sentInput;
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const request = JSON.parse(options.body);
    sentInput = JSON.parse(request.input);
    return Response.json({ id: 'older-evidence', model: 'offline-fixture', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
  });
  const response = await POST(new Request('http://localhost/api/follow-up', {
    method: 'POST', body: JSON.stringify({ language: 'en', condition: 'visual', turn: 6, fragment: 'I walked in a park with a friend.', history }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, 'generated');
  assert.equal(body.metadata.targetEvidenceId, 'answer-1');
  assert.deepEqual(sentInput.evidence, [
    { id: 'fragment', text: 'I walked in a park with a friend.' },
    ...history.map((item, index) => ({ id: `answer-${index + 1}`, text: item.answer })),
  ]);
  assert.equal(sentInput.lastAnswerWasNonRecall, false);
});

test('API falls back after schema-invalid metadata and records the rejection', async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'offline-test';
  t.after(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
  t.mock.method(global, 'fetch', async () => Response.json({ id: 'offline-fixture', model: 'offline-fixture', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ question: 'その花を覚えていますか？', conditionFocus: 'visual', targetEvidenceId: 'fragment', transitionReason: 'bad_reason' }) }] }] }));
  const response = await POST(new Request('http://localhost/api/follow-up', {
    method: 'POST', body: JSON.stringify({ language: 'ja', condition: 'visual', turn: 1, fragment: '友人と公園を歩いた。', history: [] }),
  }));
  const body = await response.json();
  assert.equal(body.source, 'fallback');
  assert.equal(body.attempts, PROMPT_CONFIG.maxFollowUpAttempts);
  assert.ok(body.diagnostics.rejections[0].flags.includes('transition_reason_schema'));
});

test('API can disable fallback and returns generation failure after the retry budget', async (t) => {
  const originalEnv = { OPENAI_API_KEY: process.env.OPENAI_API_KEY, ALLOW_FALLBACK: process.env.ALLOW_FALLBACK };
  process.env.OPENAI_API_KEY = 'offline-test';
  process.env.ALLOW_FALLBACK = 'false';
  t.after(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  let calls = 0;
  t.mock.method(global, 'fetch', async () => {
    calls += 1;
    return Response.json({ id: `offline-${calls}`, model: 'offline-fixture', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ question: 'その花を覚えていますか？', conditionFocus: 'visual', targetEvidenceId: 'fragment', transitionReason: 'bad_reason' }) }] }] });
  });
  const response = await POST(new Request('http://localhost/api/follow-up', {
    method: 'POST', body: JSON.stringify({ language: 'ja', condition: 'visual', turn: 1, fragment: '友人と公園を歩いた。', history: [] }),
  }));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'Generation failed.' });
  assert.equal(calls, PROMPT_CONFIG.maxFollowUpAttempts);
});
