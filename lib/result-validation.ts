import { PROMPT_CONFIG } from "../app/api/prompt-config";
import { isNonEmptyString, isObject, readGenerationMetadata } from "./generation";
import { joinNarrative, parseLanguage } from "./language";
import { validateNarrativeSentences, type NarrativeSentence } from "./narrative";
import { checks, evaluationItems } from "./survey";
import type { ResultData } from "./result";

function isRatingMap(value: unknown, ids: string[], allowEmpty: boolean): value is Record<string, number> {
  if (!isObject(value)) return false;
  const keys = Object.keys(value);
  if (allowEmpty && keys.length === 0) return true;
  return keys.length === ids.length && keys.every((key) => ids.includes(key)) &&
    ids.every((id) => Number.isInteger(value[id]) && Number(value[id]) >= 1 && Number(value[id]) <= 7);
}

function isTurnText(value: unknown): value is string[] {
  return Array.isArray(value) && value.length === PROMPT_CONFIG.followUpTurns && value.every(isNonEmptyString);
}

function isQuestionMetadata(value: unknown, condition: "visual" | "odor", turn: number): value is Record<string, unknown> {
  if (!isObject(value) || (value.conditionFocus !== condition && value.conditionFocus !== "neutral") ||
      !(value.targetEvidenceId === null || isNonEmptyString(value.targetEvidenceId))) return false;
  const validIds = new Set(["fragment", ...Array.from({ length: turn }, (_, index) => `answer-${index + 1}`)]);
  if (value.targetEvidenceId !== null && !validIds.has(value.targetEvidenceId)) return false;
  if (value.conditionFocus === "neutral") {
    return value.targetEvidenceId === null && (value.transitionReason === "non_recall" || value.transitionReason === "insufficient_evidence");
  }
  return value.conditionFocus === condition && value.transitionReason === undefined;
}

export function parseResultData(body: unknown): ResultData | null {
  if (!isObject(body)) return null;
  const language = parseLanguage(body.language);
  const recordType = body.recordType === undefined ? "participant" : body.recordType;
  if (!language || (recordType !== "participant" && recordType !== "batch_synthetic") ||
      (body.schemaVersion !== undefined && body.schemaVersion !== PROMPT_CONFIG.schemaVersion) ||
      (body.condition !== "visual" && body.condition !== "odor") ||
      !isNonEmptyString(body.sessionId) || body.sessionId.length > 200 || !isNonEmptyString(body.fragment) || body.fragment.length > 100 || !isNonEmptyString(body.finalResult) ||
      !isTurnText(body.questions) || !isTurnText(body.answers) ||
      !Array.isArray(body.questionMetadata) || body.questionMetadata.length !== PROMPT_CONFIG.followUpTurns ||
      !body.questionMetadata.every((value, index) => isQuestionMetadata(value, body.condition as "visual" | "odor", index)) ||
      body.narrativePromptVersion !== PROMPT_CONFIG.version ||
      validateNarrativeSentences(body.narrativeSentences, PROMPT_CONFIG.followUpTurns, PROMPT_CONFIG.narrativeMaxSentences, language).length > 0 ||
      !isRatingMap(body.evaluation, evaluationItems.map((item) => item.id), recordType === "batch_synthetic") ||
      !isRatingMap(body.checks, checks.map((item) => item.id), recordType === "batch_synthetic")) return null;

  const narrativeSentences = body.narrativeSentences as NarrativeSentence[];
  if (joinNarrative(narrativeSentences, language) !== body.finalResult ||
      !Array.isArray(body.questionGeneration) || body.questionGeneration.length !== PROMPT_CONFIG.followUpTurns) return null;
  const questionGeneration = [];
  for (const value of body.questionGeneration) {
    const generation = readGenerationMetadata(value);
    if (!generation || generation.attempts > PROMPT_CONFIG.maxFollowUpAttempts || generation.promptVersion !== PROMPT_CONFIG.followUpVersion) return null;
    questionGeneration.push(generation);
  }
  const narrativeGeneration = readGenerationMetadata(body.narrativeGeneration);
  if (!narrativeGeneration || narrativeGeneration.source !== "generated" ||
      narrativeGeneration.attempts > PROMPT_CONFIG.maxNarrativeAttempts ||
      narrativeGeneration.promptVersion !== body.narrativePromptVersion) return null;

  return {
    sessionId: body.sessionId, recordType, condition: body.condition, language,
    fragment: body.fragment, questions: body.questions, questionMetadata: body.questionMetadata,
    questionGeneration, answers: body.answers, finalResult: body.finalResult,
    narrativeSentences, narrativePromptVersion: body.narrativePromptVersion, narrativeGeneration,
    evaluation: body.evaluation, checks: body.checks,
  };
}
