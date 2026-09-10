import { type PromptCondition, type QuestionMetadata } from "./prompt-config";
import { hasNoRecallAtLatestTurn, validateQuestion, type QuestionCandidate } from "./question-validation";
import type { ConversationTurn } from "./prompt-config";
import { DEFAULT_LANGUAGE, type Language } from "../../lib/language";

const conditionQuestions: Record<PromptCondition, string> = {
  standard: "その出来事の中で、何をしていたか覚えていますか？",
  visual: "その時、何か目に入ったものを覚えていますか？",
  odor: "その時、何か匂いを思い出せますか？",
};

const neutralQuestions: Array<{ question: string; turnFunction: QuestionMetadata["turnFunction"] }> = [
  { question: "同じ出来事の中で、ほかに何が起きたか覚えていますか？", turnFunction: "broad_recall" },
  { question: "その時にしていたことを、ほかに覚えていますか？", turnFunction: "grounded_detail" },
  { question: "同じ出来事の別の時点で、何をしていたか覚えていますか？", turnFunction: "temporal_anchor" },
  { question: "同じ出来事の中で、行動の順序について覚えていることはありますか？", turnFunction: "action_relation" },
  { question: "同じ出来事で、別の場面について覚えていることはありますか？", turnFunction: "second_grounded_detail" },
  { question: "その出来事について、まだ尋ねていないことで覚えていることはありますか？", turnFunction: "unresolved_attribute" },
];

const englishConditionQuestions: Record<PromptCondition, string> = {
  standard: "What do you remember doing during that event?",
  visual: "Do you remember anything you saw at the time?",
  odor: "Do you remember any smell at the time?",
};

const englishNeutralQuestions: Array<{ question: string; turnFunction: QuestionMetadata["turnFunction"] }> = [
  { question: "What else do you remember happening during the same event?", turnFunction: "broad_recall" },
  { question: "What else do you remember doing at the time?", turnFunction: "grounded_detail" },
  { question: "What do you remember doing at another point during the same event?", turnFunction: "temporal_anchor" },
  { question: "What do you remember about the order of actions during the same event?", turnFunction: "action_relation" },
  { question: "Do you remember another part of the same event?", turnFunction: "second_grounded_detail" },
  { question: "What do you remember about the same event that has not been asked about yet?", turnFunction: "unresolved_attribute" },
];

function metadata(input: { history: ConversationTurn[] }): QuestionMetadata {
  const nonRecall = hasNoRecallAtLatestTurn(input.history);
  return {
    conditionFocus: "neutral",
    turnFunction: "broad_recall",
    targetEvidenceId: null,
    nonRecallTransition: nonRecall,
    insufficientEvidenceTransition: !nonRecall,
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
      turnFunction: "broad_recall" as const,
      targetEvidenceId: null,
      nonRecallTransition: false,
      insufficientEvidenceTransition: false,
    },
  };
  if (!hasNoRecallAtLatestTurn(input.history) && validateQuestion({ ...input, ...broadCandidate }).length === 0) {
    return broadCandidate;
  }

  // Fixed neutral fallback cannot determine semantic answer state; the route
  // records non-recall only from its existing lexical hint and otherwise uses
  // insufficientEvidenceTransition as the reason for this safe generic path.
  const transitionMetadata = metadata({ history: input.history });
  for (const alternative of neutral) {
    const candidate = { question: alternative.question, metadata: { ...transitionMetadata, turnFunction: alternative.turnFunction } };
    if (validateQuestion({ ...input, ...candidate }).length === 0) return candidate;
  }
  throw new Error(`No valid fallback question for turn ${input.turn}`);
}
