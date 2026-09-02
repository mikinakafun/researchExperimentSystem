import { TURN_FUNCTIONS, type PromptCondition, type QuestionMetadata } from "./prompt-config";
import { hasNoRecallAtLatestTurn, validateQuestion, type QuestionCandidate } from "./question-validation";
import type { ConversationTurn } from "./prompt-config";
import { DEFAULT_LANGUAGE, type Language } from "../../lib/language";

const conditionQuestions: Record<PromptCondition, string[]> = {
  standard: [
    "その出来事の中で、何をしていたか覚えていますか？",
    "直前に述べた行動について、ほかに覚えていることはありますか？",
    "その行動は、出来事のどの時点で起きましたか？",
    "その行動の前後に、何をしていたか覚えていますか？",
  ],
  visual: [
    "その時、何か目に入ったものを覚えていますか？",
    "直前に述べた見えたものについて、ほかに覚えている見た目はありますか？",
    "その見えたものは、出来事のどの時点で目に入りましたか？",
    "その見えたものを目にした時、何をしていましたか？",
  ],
  odor: [
    "その時、何か匂いを思い出せますか？",
    "直前に述べた匂いについて、ほかに覚えている特徴はありますか？",
    "その匂いは、出来事のどの時点で気づきましたか？",
    "その匂いに気づいた時、何をしていましたか？",
  ],
};

const neutralQuestions = [
  "同じ出来事の中で、ほかに何が起きたか覚えていますか？",
  "その時にしていたことを、ほかに覚えていますか？",
  "同じ出来事の別の時点で、何をしていたか覚えていますか？",
  "その出来事が始まった時、何をしていたか覚えていますか？",
  "その出来事の後で、何をしたか覚えていますか？",
  "その出来事の中で、自分がしたことをもう一つ覚えていますか？",
];

const englishConditionQuestions: Record<PromptCondition, string[]> = {
  standard: [
    "What do you remember doing during that event?",
    "What else do you remember about the action you just described?",
    "At what point in the event did that action happen?",
    "What do you remember doing before or after that action?",
  ],
  visual: [
    "Do you remember anything you saw at the time?",
    "What else do you remember about the appearance of what you just described?",
    "At what point in the event did you see it?",
    "What were you doing when you saw it?",
  ],
  odor: [
    "Do you remember any smell at the time?",
    "What else do you remember about the smell you just described?",
    "At what point in the event did you notice that smell?",
    "What were you doing when you noticed that smell?",
  ],
};

const englishNeutralQuestions = [
  "What else do you remember happening during the same event?",
  "What else do you remember doing at the time?",
  "What do you remember doing at another point during the same event?",
  "What do you remember doing when the event began?",
  "What do you remember doing after the event?",
  "Do you remember another action you took during that event?",
];

function metadata(input: { condition: PromptCondition; turn: number; history: ConversationTurn[] }): QuestionMetadata {
  const nonRecall = hasNoRecallAtLatestTurn(input.history);
  const insufficient = !nonRecall && input.turn >= 5;
  const transition = nonRecall || insufficient;
  return {
    conditionFocus: transition ? "neutral" : input.condition,
    turnFunction: TURN_FUNCTIONS[input.turn],
    targetEvidenceId: transition || input.turn === 1 ? null : `answer-${input.turn - 1}`,
    nonRecallTransition: nonRecall,
    insufficientEvidenceTransition: insufficient,
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
  const questionMetadata = metadata(input);
  const question = questionMetadata.conditionFocus === "neutral"
    ? neutral[(input.turn - 2) % neutral.length]
    : focused[input.condition][Math.min(input.turn - 1, 3)];
  const candidate = { question, metadata: questionMetadata };
  if (validateQuestion({ ...input, ...candidate }).length === 0) return candidate;

  // Earlier generated questions may already match a fallback. Keep a distinct,
  // neutral alternative available, including repeated non-recall across six turns.
  const neutralMetadata: QuestionMetadata = {
    ...questionMetadata,
    conditionFocus: "neutral",
    targetEvidenceId: null,
    insufficientEvidenceTransition: !questionMetadata.nonRecallTransition,
  };
  for (const alternative of neutral) {
    const candidate = { question: alternative, metadata: neutralMetadata };
    if (validateQuestion({ ...input, ...candidate }).length === 0) return candidate;
  }
  throw new Error(`No valid fallback question for turn ${input.turn}`);
}
