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
const { buildFollowUpInstructions, PROMPT_CONFIG } = require('../app/api/prompt-config.ts');

function input(question, overrides = {}) {
  return {
    condition: 'visual', turn: 1, fragment: '友人と公園を歩いた。', history: [], question,
    ...overrides,
    metadata: {
      conditionFocus: overrides.condition ?? 'visual', targetEvidenceId: null,
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
  for (const condition of ['visual', 'odor']) {
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
      turn: 5, history, metadata: { targetEvidenceId },
    })), []);
  }
});

test('neutral transition is allowed before turn five, without requiring a specific event word', () => {
  assert.deepEqual(validateQuestion(input('ほかに覚えていることはありますか？', {
    turn: 2, history: [{ question: '何か覚えていますか？', answer: '特にありません。' }],
    metadata: { conditionFocus: 'neutral', transitionReason: 'insufficient_evidence' },
  })), []);
});

test('partly recalled answers remain available as evidence', () => {
  assert.deepEqual(validateQuestion(input('その花の見た目を教えてください。', {
    turn: 2, history: [{ question: '何か見えましたか？', answer: '場所は思い出せませんが、赤い花が見えました。' }],
    metadata: { targetEvidenceId: 'answer-1' },
  })), []);
});

test('condition contamination and odor source inference are still rejected', () => {
  const cases = [
    ['visual', 'どんな匂いでしたか？', 'visual_odor_contamination'],
    ['visual', '何か音を覚えていますか？', 'visual_condition_contamination'],
    ['odor', '何色でしたか？', 'odor_condition_contamination'],
    ['odor', '匂いの原因を想像できますか？', 'odor_source_inference'],
    ['odor', 'その甘い花の香りは、なぜしたのだと思いますか？', 'odor_source_inference'],
  ];
  for (const [condition, question, flag] of cases) {
    assert.ok(validateQuestion(input(question, { condition })).includes(flag), question);
  }
  assert.deepEqual(validateQuestion(input('その匂いは、どの時点から覚えていますか？', { condition: 'odor' })), []);
  // DEC-049: naming what an odor was an odor of is recall, not source inference.
  assert.deepEqual(validateQuestion(input('その甘い香りは、どのような花の匂いだったか覚えていますか？', { condition: 'odor' })), []);
  assert.ok(validateQuestion(input('何か匂いを覚えていますか？', {
    metadata: { conditionFocus: 'neutral', transitionReason: 'non_recall' },
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
    [{ transitionReason: 'unknown' }, 'invalid_transition_reason'],
    [{ targetEvidenceId: 'answer-99' }, 'invalid_target_evidence_id'],
    [{ transitionReason: 'unknown' }, 'invalid_transition_reason'],
    [{ conditionFocus: 'neutral' }, 'neutral_without_transition'],
  ];
  for (const [metadata, flag] of cases) assert.ok(validateQuestion(input('花を覚えていますか？', { metadata })).includes(flag), flag);
});

test('all prompt branches render without requiring a fixed opening', () => {
  for (const condition of ['visual', 'odor']) {
    for (let turn = 1; turn <= 6; turn++) {
      for (const nonRecall of [true, false]) {
        const instructions = buildFollowUpInstructions(condition, turn, nonRecall);
        assert.ok(!instructions.includes('{{'));
        assert.ok(instructions.includes('全履歴'));
        assert.ok(instructions.includes('既に尋ねた'));
        assert.ok(!instructions.includes('ターン別の機能は目安'));
        assert.ok(!instructions.includes('80文字以内'));
      }
    }
  }
});

test('v0.4.4 keeps first-turn absence separate from non-recall and preserves the condition boundary', () => {
  for (const [condition, expected] of [
    ['visual', 'その時、何か目に入ったものを覚えていますか？'],
    ['odor', 'その時、何か匂いを思い出せますか？'],
  ]) {
    const candidate = require('../app/api/fallback-questions.ts').fallbackQuestion({
      condition, turn: 1, fragment: '友人と公園にいた。', history: [], language: 'ja',
    });
    assert.equal(candidate.question, expected);
    assert.equal(candidate.metadata.conditionFocus, condition);
    assert.equal(candidate.metadata.targetEvidenceId, null);
  }
  const odorPrompt = buildFollowUpInstructions('odor', 1, false, undefined, 'ja');
  assert.match(odorPrompt, /初期断片に匂いを示す語がなくても/);
  for (const [condition, expected] of [
    ['visual', 'Do you remember anything you saw at the time?'],
    ['odor', 'Do you remember any smell at the time?'],
  ]) {
    const candidate = require('../app/api/fallback-questions.ts').fallbackQuestion({
      condition, turn: 1, fragment: 'I was at a park with a friend.', history: [], language: 'en',
    });
    assert.equal(candidate.question, expected);
    assert.deepEqual(validateQuestion({ condition, turn: 1, fragment: 'I was at a park with a friend.', history: [], language: 'en', ...candidate }), []);
  }
  assert.match(buildFollowUpInstructions('odor', 1, false, undefined, 'en'), /initial fragment contains no odor word/);
});

test('fallback does not switch solely because of turn five or six and keeps neutral flags consistent', () => {
  const { fallbackQuestion } = require('../app/api/fallback-questions.ts');
  for (const turn of [5, 6]) {
    const history = Array.from({ length: turn - 1 }, (_, i) => ({ question: `質問${i + 1}？`, answer: '公園にいた。' }));
    const ordinary = fallbackQuestion({ condition: 'visual', turn, fragment: '公園にいた。', history, language: 'ja' });
    assert.equal(ordinary.metadata.conditionFocus, 'visual');
    assert.equal(ordinary.metadata.nonRecallTransition, false);
    assert.equal(ordinary.metadata.insufficientEvidenceTransition, false);
    assert.equal(ordinary.metadata.targetEvidenceId, null);
    assert.ok(['broad_recall', 'grounded_detail', 'temporal_anchor', 'action_relation', 'second_grounded_detail', 'unresolved_attribute'].includes(ordinary.metadata.turnFunction));
    const nonRecall = fallbackQuestion({ condition: 'visual', turn, fragment: '公園にいた。', history: [...history.slice(0, -1), { question: '前の質問？', answer: '思い出せません。' }], language: 'ja' });
    assert.equal(nonRecall.metadata.nonRecallTransition, true);
    assert.equal(nonRecall.metadata.insufficientEvidenceTransition, false);
    const exhausted = fallbackQuestion({ condition: 'visual', turn, fragment: '公園にいた。', history: [{ question: 'その時、何か目に入ったものを覚えていますか？', answer: '公園にいた。' }, ...history.slice(1)], language: 'ja' });
    assert.equal(exhausted.metadata.conditionFocus, 'neutral');
    assert.equal(exhausted.metadata.nonRecallTransition, false);
    assert.equal(exhausted.metadata.insufficientEvidenceTransition, true);
  }
});

test('API sends full history and accepts an independently chosen function for partial recall', async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'offline-test';
  t.after(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
  const history = [{ question: '何か見えましたか？', answer: '場所は思い出せませんが、赤い花は見えました。' }];
  const output = { question: 'その赤い花について、ほかに覚えている見た目はありますか？', conditionFocus: 'visual', turnFunction: 'unresolved_attribute', targetEvidenceId: 'answer-1', nonRecallTransition: false, insufficientEvidenceTransition: false };
  t.mock.method(global, 'fetch', async (url, options) => {
    const request = JSON.parse(options.body);
    const input = JSON.parse(request.input);
    assert.equal(input.previousTurns.length, 1);
    assert.equal(input.previousTurns[0].answer, history[0].answer);
    assert.match(request.instructions, /既知の内容/);
    return Response.json({ id: 'state-test', model: 'offline-fixture', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
  });
  const response = await POST(new Request('http://localhost/api/follow-up', { method: 'POST', body: JSON.stringify({ condition: 'visual', turn: 2, fragment: '友人と公園を歩いた。', history }) }));
  const body = await response.json();
  assert.equal(body.source, 'generated');
  assert.equal(body.promptVersion, PROMPT_CONFIG.followUpVersion);
  assert.equal(body.metadata.turnFunction, 'unresolved_attribute');
});

test('both languages keep instructions independent of turn position and forward older evidence', async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'offline-test';
  t.after(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
  let expected;
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const sent = JSON.parse(options.body);
    const input = JSON.parse(sent.input);
    assert.deepEqual(input.previousTurns, expected.history);
    assert.deepEqual(input.evidence, [{ id: 'fragment', text: expected.fragment }, ...expected.history.map((item, i) => ({ id: `answer-${i + 1}`, text: item.answer }))]);
    assert.equal(input.lastAnswerWasNonRecall, true);
    assert.equal(input.turn, 6);
    return Response.json({ id: 'older-evidence', model: 'offline-fixture', output: [{ content: [{ type: 'output_text', text: JSON.stringify(expected.output) }] }] });
  });
  for (const language of ['ja', 'en']) {
    for (const condition of ['visual', 'odor']) {
      for (const nonRecall of [false, true]) {
        const first = buildFollowUpInstructions(condition, 1, nonRecall, undefined, language);
        for (let turn = 2; turn <= 6; turn++) assert.equal(buildFollowUpInstructions(condition, turn, nonRecall, undefined, language), first);
      }
    }
    const answer = language === 'ja' ? '赤い花は覚えていますが、場所は思い出せません。' : 'I remember red flowers, but I cannot remember the place.';
    expected = {
      fragment: language === 'ja' ? '友人と公園を歩いた。' : 'I walked in a park with a friend.',
      history: Array.from({ length: 5 }, (_, i) => ({ question: language === 'ja' ? `以前の質問${i + 1}？` : `Earlier question ${i + 1}?`, answer })),
      output: { question: language === 'ja' ? 'その花を目にしたのは、出来事のどの時点でしたか？' : 'At what point in the event did you see those flowers?', conditionFocus: 'visual', turnFunction: 'temporal_anchor', targetEvidenceId: 'answer-1', nonRecallTransition: false, insufficientEvidenceTransition: false },
    };
    const response = await POST(new Request('http://localhost/api/follow-up', { method: 'POST', body: JSON.stringify({ language, condition: 'visual', turn: 6, fragment: expected.fragment, history: expected.history }) }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.source, 'generated');
    assert.equal(body.metadata.targetEvidenceId, 'answer-1');
    assert.equal(body.metadata.turnFunction, 'temporal_anchor');
  }
});

test('fixed fallbacks complete six turns in both languages without assuming a reported target', () => {
  const { fallbackQuestion } = require('../app/api/fallback-questions.ts');
  for (const language of ['ja', 'en']) {
    for (const condition of ['standard', 'visual', 'odor']) {
      for (const nonRecall of [false, true]) {
        const history = [];
        const fragment = language === 'ja' ? '公園にいた。' : 'I was in a park.';
        for (let turn = 1; turn <= 6; turn++) {
          const candidate = fallbackQuestion({ condition, turn, fragment, history, language });
          assert.deepEqual(validateQuestion({ condition, turn, fragment, history, language, ...candidate }), []);
          assert.equal(candidate.metadata.targetEvidenceId, null);
          assert.doesNotMatch(candidate.question, /直前に述べた|その匂い|その行動|that action|that smell|just described/);
          if (turn > 1) {
            assert.equal(candidate.metadata.conditionFocus, 'neutral');
            assert.equal(candidate.metadata.nonRecallTransition, nonRecall);
            assert.equal(candidate.metadata.insufficientEvidenceTransition, !nonRecall);
          }
          history.push({ ...candidate, answer: nonRecall ? (language === 'ja' ? '思い出せません。' : 'I cannot remember.') : fragment });
        }
        // Late questions may still use an unused broad condition prompt.
        for (const turn of [5, 6]) {
          const previous = history.slice(0, turn - 1).map((item, i) => ({ ...item, question: language === 'ja' ? `以前の質問${i}？` : `Earlier question ${i}?`, answer: fragment }));
          const candidate = fallbackQuestion({ condition, turn, fragment, history: previous, language });
          assert.equal(candidate.metadata.conditionFocus, condition);
          assert.equal(candidate.metadata.turnFunction, 'broad_recall');
        }
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
  assert.equal(body.promptVersion, PROMPT_CONFIG.followUpVersion);
  assert.equal(body.question, valid.question);
  assert.equal(calls, 1);

  output = { ...output, question: 'どんな匂いでしたか？' };
  calls = 0;
  response = await POST(request());
  body = await response.json();
  assert.equal(body.source, 'fallback');
  assert.equal(body.promptVersion, PROMPT_CONFIG.followUpVersion);
  assert.equal(calls, 3);
  assert.equal(body.diagnostics.rejections[0].question, output.question);
  assert.equal(body.diagnostics.rejections[0].metadata.conditionFocus, 'visual');

  output = { ...output, question: valid.question, nonRecallTransition: 'false' };
  response = await POST(request());
  body = await response.json();
  assert.equal(body.source, 'fallback');
  assert.equal(body.promptVersion, PROMPT_CONFIG.followUpVersion);
  assert.ok(body.diagnostics.rejections[0].flags.includes('non_recall_transition_schema'));
});
