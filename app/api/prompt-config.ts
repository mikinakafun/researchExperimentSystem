import { readPromptSection, renderPrompt } from "../../lib/prompt-files";
import { DEFAULT_LANGUAGE, type Language } from "../../lib/language";

export type PromptCondition = "visual" | "odor";
export type ConditionFocus = PromptCondition | "neutral";
export type TransitionReason = "non_recall" | "insufficient_evidence";

export type QuestionMetadata = {
  conditionFocus: ConditionFocus;
  targetEvidenceId: string | null;
  transitionReason: TransitionReason | null;
};

export type ConversationTurn = {
  question: string;
  answer: string;
  metadata?: QuestionMetadata;
};

export const PROMPT_CONFIG = {
  version: "prompt-catalog-v0.4.3-mock-draft",
  followUpVersion: "prompt-catalog-v0.4.5-mock-draft",
  followUpTurns: 6,
  followUpTemperature: 0.55,
  maxFollowUpAttempts: 3,
  narrativeMaxSentences: 10,
  narrativeTemperature: 0.75,
  maxNarrativeAttempts: 3,
} as const;

// Fallback is enabled by default for compatibility with the existing pilot.
// Only an explicit false value disables the fixed question fallback.
export function allowFallback(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_FALLBACK?.trim().toLowerCase() !== "false";
}

export function buildFollowUpInstructions(
  condition: PromptCondition,
  turn: number,
  lastAnswerWasNonRecall: boolean,
  retryReason?: string,
  language: Language = DEFAULT_LANGUAGE,
) {
  if (!Number.isInteger(turn) || turn < 1 || turn > PROMPT_CONFIG.followUpTurns) {
    throw new Error(`Unsupported follow-up turn: ${turn}`);
  }
  const guidancePath = `v0.4.5-mock-draft/follow-up-guidance.${language}.txt`;
  return renderPrompt(`v0.4.5-mock-draft/follow-up.${language}.txt`, {
    CONDITION_GUIDANCE: readPromptSection(guidancePath, `condition-${condition}`),
    TRANSITION_GUIDANCE: readPromptSection(
      guidancePath,
      lastAnswerWasNonRecall ? "non-recall-transition" : "normal-transition",
    ),
    RETRY_REASON_BLOCK: retryReason
      ? language === "en"
        ? `\nThe previous output was rejected for these reasons. Correct them in this output: ${retryReason}`
        : `\n前回の出力は次の理由で不採用だった。今回の出力では必ず修正する: ${retryReason}`
      : "",
  });
}

export function buildNarrativeInstructions(retryReason?: string, language: Language = DEFAULT_LANGUAGE) {
  return renderPrompt(`v0.4.3-mock-draft/narrative.${language}.txt`, {
    MAX_SENTENCES: String(PROMPT_CONFIG.narrativeMaxSentences),
    RETRY_REASON_BLOCK: retryReason
      ? language === "en"
        ? `The previous output was rejected for these reasons. Correct them in this output: ${retryReason}`
        : `前回の出力は次の理由で不採用だった。今回の出力では必ず修正する: ${retryReason}`
      : "",
  });
}
