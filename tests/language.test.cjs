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

const { parseLanguage, joinNarrative, matchesOutputLanguage } = require('../lib/language.ts');
const { englishMessages, translate } = require('../lib/ui-language.ts');
const { RESULT_CSV_PATH } = require('../lib/result-storage.ts');
const { buildFollowUpInstructions, buildNarrativeInstructions, PROMPT_CONFIG } = require('../app/api/prompt-config.ts');
const { fallbackQuestion } = require('../app/api/fallback-questions.ts');
const { validateQuestion, saysNoRecall } = require('../app/api/question-validation.ts');
const { validateNarrativeSentences } = require('../lib/narrative.ts');
const { POST: followUp } = require('../app/api/follow-up/route.ts');
const { POST: narrative } = require('../app/api/narrative/route.ts');

const request = (body) => new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify(body) });
const responseFor = (output) => Response.json({ id: 'language-test', model: 'offline-fixture', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
const fragment = 'I walked through a park with a friend.';
const sentence = { text: 'I said goodbye and walked home again.', sourceIds: ['fragment'], containsCreativeAddition: true };
const answers = Array.from({ length: 6 }, (_, index) => ({ question: `What happened at point ${index + 1}?`, answer: 'We walked together.' }));

function mockKey(t) {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'offline-language-test';
  t.after(() => { if (original === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = original; });
}

const { generationMetadata } = require('./result-fixtures.cjs');
const { readGenerationMetadata } = require('../lib/generation.ts');
test('language defaults, invalid input, and all UI translations are explicit', () => {
  assert.equal(parseLanguage(undefined), 'ja');
  for (const language of ['ja', 'en']) assert.equal(parseLanguage(language), language);
  for (const value of [null, '', 'fr', 'EN', 1, {}, ['en']]) assert.equal(parseLanguage(value), null);
  for (const [key, english] of Object.entries(englishMessages)) {
    assert.equal(translate('ja', key), key);
    assert.equal(translate('en', key), english);
    assert.ok(matchesOutputLanguage(english, 'en'), key);
  }
});

test('all condition, turn, transition, and retry prompts render in the selected language', () => {
  for (const language of ['ja', 'en']) {
    for (const condition of ['standard', 'visual', 'odor']) {
      for (let turn = 1; turn <= 6; turn++) {
        for (const nonRecall of [false, true]) {
          const prompt = buildFollowUpInstructions(condition, turn, nonRecall, 'test_retry', language);
          assert.ok(matchesOutputLanguage(prompt, language));
          assert.ok(prompt.includes('test_retry'));
          assert.ok(!prompt.includes('{{'));
        }
      }
    }
    const prompt = buildNarrativeInstructions('test_retry', language);
    assert.ok(matchesOutputLanguage(prompt, language));
    assert.ok(!prompt.includes('{{'));
    assert.ok(prompt.includes('test_retry'));
  }
});

test('fallback questions remain valid and distinct through all six turns, including repeated non-recall', () => {
  for (const language of ['ja', 'en']) {
    for (const condition of ['standard', 'visual', 'odor']) {
      for (const nonRecall of [false, true]) {
        const history = [];
        for (let turn = 1; turn <= 6; turn++) {
          const input = { language, condition, turn, fragment, history };
          const candidate = fallbackQuestion(input);
          assert.ok(matchesOutputLanguage(candidate.question, language));
          assert.deepEqual(validateQuestion({ ...input, ...candidate }), []);
          history.push({ ...candidate, answer: nonRecall ? "I can't recall." : 'We walked together.' });
        }
        assert.equal(new Set(history.map((item) => item.question)).size, 6);
      }
    }
  }
});

test('English non-recall and word boundaries do not confuse ordinary words with conditions or AI', () => {
  for (const answer of ["I can't remember.", 'I cannot recall.', 'I don’t know.', 'I could not remember.', 'No smell.']) assert.ok(saysNoRecall(answer), answer);
  assert.equal(saysNoRecall('I remember a scent.'), false);
  for (const [condition, question] of [
    ['standard', 'What did you do again?'],
    ['standard', 'What happened when you arrived?'],
    ['odor', 'What do you remember about the odor?'],
  ]) {
    const input = { language: 'en', condition, turn: 1, fragment, history: [] };
    assert.deepEqual(validateQuestion({ ...input, ...fallbackQuestion(input), question }), []);
  }
  for (const [condition, question, flag] of [
    ['standard', 'What color was it?', 'standard_sensory_contamination'],
    ['standard', 'How did you feel?', 'standard_emotion_focus'],
    ['visual', 'What smell do you remember?', 'visual_odor_contamination'],
    ['odor', 'What sound did you hear?', 'odor_condition_contamination'],
    ['odor', 'Which flower did it come from?', 'odor_source_inference'],
    ['visual', 'What did the AI ask?', 'study_disclosure'],
    ['visual', '何が見えましたか？', 'output_language_mismatch'],
  ]) {
    const input = { language: 'en', condition, turn: 1, fragment, history: [] };
    assert.ok(validateQuestion({ ...input, ...fallbackQuestion(input), question }).includes(flag), question);
  }
});

test('English narratives accept periods, decimals and ordinary words, but reject multiple sentences or wrong language', () => {
  const validate = (text) => validateNarrativeSentences([{ ...sentence, text }], 6, 10, 'en');
  for (const text of [sentence.text, 'The air carried an odor of rain.', 'We walked 2.5 miles.', 'I said, “Let us go.”']) assert.deepEqual(validate(text), [], text);
  for (const text of ['We walked home. It was late.', 'We walked home']) assert.ok(validate(text).includes('sentence_1_punctuation'), text);
  assert.ok(validate('友人と公園を歩いた。').includes('sentence_1_language_mismatch'));
  assert.ok(validate('The AI generated a story.').includes('sentence_1_disclosure'));
  assert.equal(joinNarrative([sentence, { text: 'We met again.' }], 'en'), `${sentence.text} We met again.`);
  assert.equal(joinNarrative([{ text: '歩いた。' }, { text: '帰った。' }], 'ja'), '歩いた。帰った。');
});

test('API forwards English instructions and retries in English, with English fallback after wrong-language outputs', async (t) => {
  mockKey(t);
  const input = { language: 'en', condition: 'odor', turn: 1, fragment, history: [] };
  const candidate = fallbackQuestion(input);
  const calls = [];
  let wrongLanguage = false;
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    calls.push(body);
    assert.ok(matchesOutputLanguage(body.instructions, 'en'));
    assert.equal(JSON.parse(body.input).language, 'en');
    return responseFor({ question: wrongLanguage ? '何か匂いを思い出せますか？' : candidate.question, ...candidate.metadata });
  });
  let response = await followUp(request(input));
  assert.equal(response.status, 200);
  let body = await response.json();
  assert.equal(body.language, 'en');
  assert.equal(body.source, 'generated');
  wrongLanguage = true;
  response = await followUp(request(input));
  assert.equal(response.status, 200);
  body = await response.json();
  assert.equal(body.language, 'en');
  assert.equal(body.source, 'fallback');
  assert.equal(body.question, candidate.question);
  assert.ok(calls.at(-1).instructions.includes('output_language_mismatch'));
});

test('English narrative generation retries, joins sentences with spaces, and saves language without changing legacy CSV', async (t) => {
  mockKey(t);
  let attempts = 0;
  const sentences = [sentence, { ...sentence, text: 'We met again.', sourceIds: ['answer-1'] }];
  t.mock.method(global, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body);
    assert.ok(matchesOutputLanguage(body.instructions, 'en'));
    assert.equal(JSON.parse(body.input).language, 'en');
    attempts++;
    if (attempts > 1) assert.ok(body.instructions.includes('language_mismatch'));
    return responseFor({ sentences: attempts === 1 ? [{ ...sentence, text: '公園を歩いた。' }] : sentences });
  });
  const response = await narrative(request({ language: 'en', fragment, answers }));
  assert.equal(response.status, 200);
  const generated = await response.json();
  assert.equal(generated.language, 'en');
  assert.equal(generated.attempts, 2);
  assert.equal(generated.narrative, joinNarrative(sentences, 'en'));

  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'language-storage-'));
  const previousCwd = process.cwd();
  let save;
  try {
    process.chdir(temporary);
    save = require('../app/api/save-result/route.ts').POST;
  } finally { process.chdir(previousCwd); }
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  fs.mkdirSync(path.join(temporary, 'data'));
  const legacy = path.join(temporary, 'data/results-v0.4.3.csv');
  fs.writeFileSync(legacy, 'legacy data must stay untouched\n');
  const payload = {
    language: 'en', sessionId: 'english-fixture', recordType: 'batch_synthetic', condition: 'odor', fragment,
    questions: answers.map((item) => item.question), answers: answers.map((item) => item.answer),
    questionMetadata: Array(6).fill({ conditionFocus: 'odor' }),
    finalResult: generated.narrative, narrativeSentences: generated.sentences,
    narrativePromptVersion: PROMPT_CONFIG.version, evaluation: {}, checks: {},
    narrativeGeneration: readGenerationMetadata(generated), questionGeneration: Array.from({ length: 6 }, () => generationMetadata()),
  };
  const saved = await save(request(payload));
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).path, RESULT_CSV_PATH);
  assert.equal((await (await save(request(payload))).json()).duplicate, true);
  const csv = fs.readFileSync(path.join(temporary, RESULT_CSV_PATH), 'utf8');
  const headers = csv.split('\n')[0].split(',');
  const values = csv.split('\n')[1].split(',');
  assert.equal(values[headers.indexOf('"language"')], '"en"');
  assert.equal(fs.readFileSync(legacy, 'utf8'), 'legacy data must stay untouched\n');
  for (const language of [null, 'fr', 'ja']) assert.equal((await save(request({ ...payload, language }))).status, 400);
  assert.equal((await save(request({ ...payload, finalResult: sentences.map((item) => item.text).join('') }))).status, 400);
  fs.writeFileSync(path.join(temporary, RESULT_CSV_PATH), 'mismatched,header\n');
  assert.equal((await save(request({ ...payload, sessionId: 'header-test' }))).status, 503);
  assert.equal(fs.readFileSync(path.join(temporary, RESULT_CSV_PATH), 'utf8'), 'mismatched,header\n');
});

test('generation APIs reject invalid languages before making any external request', async (t) => {
  t.mock.method(global, 'fetch', async () => { throw new Error('No network request expected'); });
  for (const language of [null, 'fr', '', 42, {}]) {
    assert.equal((await followUp(request({ language, condition: 'standard', turn: 1, fragment, history: [] }))).status, 400);
    assert.equal((await narrative(request({ language, fragment, answers }))).status, 400);
  }
});
