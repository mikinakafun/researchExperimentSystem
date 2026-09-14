const { PROMPT_CONFIG } = require('../app/api/prompt-config.ts');
const { checks, evaluationItems } = require('../lib/survey.ts');

function generationMetadata(overrides = {}) {
  return {
    model: 'offline-model', requestId: 'offline-response', promptVersion: PROMPT_CONFIG.version,
    source: 'generated', fallbackReason: null, attempts: 1, diagnostics: { rejections: [] }, ...overrides,
  };
}

function resultPayload(overrides = {}) {
  const narrativeSentences = [{ text: '友人と公園を歩いた。', sourceIds: ['fragment'], containsCreativeAddition: false }];
  return {
    sessionId: 'offline-session', recordType: 'participant', language: 'ja', condition: 'visual',
    fragment: '友人と公園を歩いた。',
    questions: Array.from({ length: 6 }, (_, index) => `質問${index + 1}？`),
    answers: Array.from({ length: 6 }, (_, index) => `回答${index + 1}。`),
    questionMetadata: Array.from({ length: 6 }, () => ({ conditionFocus: 'visual', targetEvidenceId: 'fragment', transitionReason: null })),
    questionGeneration: Array.from({ length: 6 }, (_, index) => generationMetadata({ requestId: `offline-question-${index + 1}`, promptVersion: PROMPT_CONFIG.followUpVersion })),
    finalResult: narrativeSentences[0].text, narrativeSentences,
    narrativePromptVersion: PROMPT_CONFIG.version, narrativeGeneration: generationMetadata(),
    evaluation: Object.fromEntries(evaluationItems.map(({ id }) => [id, 4])),
    checks: Object.fromEntries(checks.map(({ id }) => [id, 4])),
    ...overrides,
  };
}
module.exports = { generationMetadata, resultPayload };
