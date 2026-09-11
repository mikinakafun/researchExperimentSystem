import { type PromptCondition, type QuestionMetadata } from "./prompt-config";
import { hasNoRecallAtLatestTurn, validateQuestion, type QuestionCandidate } from "./question-validation";
import type { ConversationTurn } from "./prompt-config";
import { DEFAULT_LANGUAGE, type Language } from "../../lib/language";

const conditionQuestions: Record<PromptCondition, string> = {
  visual: "その時、何か目に入ったものを覚えていますか？",
  odor: "その時、何か匂いを思い出せますか？",
};

const neutralQuestions: string[] = [
  "同じ出来事の中で、ほかに何が起きたか覚えていますか？",
  "その時にしていたことを、ほかに覚えていますか？",
  "同じ出来事の別の時点で、何をしていたか覚えていますか？",
  "同じ出来事の中で、行動の順序について覚えていることはありますか？",
  "同じ出来事で、別の場面について覚えていることはありますか？",
  "その出来事について、まだ尋ねていないことで覚えていることはありますか？",
];

const englishConditionQuestions: Record<PromptCondition, string> = {
  visual: "Do you remember anything you saw at the time?",
  odor: "Do you remember any smell at the time?",
};

const englishNeutralQuestions: string[] = [
  "What else do you remember happening during the same event?",
  "What else do you remember doing at the time?",
  "What do you remember doing at another point during the same event?",
  "What do you remember about the order of actions during the same event?",
  "Do you remember another part of the same event?",
  "What do you remember about the same event that has not been asked about yet?",
];

function metadata(input: { history: ConversationTurn[] }): QuestionMetadata {
  const nonRecall = hasNoRecallAtLatestTurn(input.history);
  return {
    conditionFocus: "neutral",
    targetEvidenceId: null,
    transitionReason: nonRecall ? "non_recall" : "insufficient_evidence",
  };
}

export function fallbackQuestion(input: {
  condition: PromptCondition;
  turn: number;
  fragment: string;
  history: ConversationTurn[];
  language?: Language;
}): QuestionCandidate {
  const language = input.language ?? DEFAULT_LANGUAGE;
  const neutral = language === "en" ? englishNeutralQuestions : neutralQuestions;
  const focused = language === "en" ? englishConditionQuestions : conditionQuestions;
  const broadCandidate = {
    question: focused[input.condition],
    metadata: {
      conditionFocus: input.condition,
      targetEvidenceId: null,
    },
  };
  if (!hasNoRecallAtLatestTurn(input.history) && validateQuestion({ ...input, ...broadCandidate }).length === 0) {
    return broadCandidate;
  }

  // Fixed neutral fallback cannot determine semantic answer state; the route
  // records non-recall only from its existing lexical hint and otherwise uses
  // insufficientEvidenceTransition as the reason for this safe generic path.
  const transitionMetadata = metadata({ history: input.history });
  for (const question of neutral) {
    const candidate = { question, metadata: transitionMetadata };
    if (validateQuestion({ ...input, ...candidate }).length === 0) return candidate;
  }
  throw new Error(`No valid fallback question for turn ${input.turn}`);
}
