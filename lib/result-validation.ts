import { PROMPT_CONFIG } from "../app/api/prompt-config";
import { isNonEmptyString, isObject, readGenerationMetadata } from "./generation";
import { joinNarrative, parseLanguage } from "./language";
import { validateNarrativeSentences, type NarrativeSentence } from "./narrative";
import { checks, evaluationItems } from "./survey";
import type { ResultData } from "./result";

function isQuestionMetadata(value: unknown, condition: ResultData["condition"], turn: number): boolean {
  if (!isObject(value) ||
      "turnFunction" in value || "nonRecallTransition" in value || "insufficientEvidenceTransition" in value ||
      !["visual", "odor", "neutral"].includes(value.conditionFocus as string) ||
      (value.targetEvidenceId !== null && typeof value.targetEvidenceId !== "string") ||
      (value.transitionReason !== null && value.transitionReason !== "non_recall" && value.transitionReason !== "insufficient_evidence")) return false;
  if (value.conditionFocus === "neutral") {
    return value.targetEvidenceId === null && value.transitionReason !== null;
  }
  return value.conditionFocus === condition && typeof value.targetEvidenceId === "string" &&
    ["fragment", ...Array.from({ length: Math.max(0, turn - 1) }, (_, index) => `answer-${index + 1}`)].includes(value.targetEvidenceId) &&
    value.transitionReason === null;
}

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

export function parseResultData(body: unknown): ResultData | null {
  if (!isObject(body)) return null;
  const language = parseLanguage(body.language);
  const recordType = body.recordType === undefined ? "participant" : body.recordType;
  if (!language || (recordType !== "participant" && recordType !== "batch_synthetic") ||
      (body.condition !== "visual" && body.condition !== "odor") ||
      !isNonEmptyString(body.sessionId) || body.sessionId.length > 200 || !isNonEmptyString(body.fragment) || !isNonEmptyString(body.finalResult) ||
      !isTurnText(body.questions) || !isTurnText(body.answers) ||
      !Array.isArray(body.questionMetadata) || body.questionMetadata.length !== PROMPT_CONFIG.followUpTurns ||
      !body.questionMetadata.every((value, index) => isQuestionMetadata(value, body.condition as ResultData["condition"], index + 1)) ||
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
    if (!generation || generation.attempts > PROMPT_CONFIG.maxFollowUpAttempts ||
        generation.promptVersion !== PROMPT_CONFIG.followUpVersion) return null;
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
