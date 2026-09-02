import { TURN_FUNCTIONS, type PromptCondition, type QuestionMetadata } from "./prompt-config";
import { hasNoRecallAtLatestTurn, validateQuestion, type QuestionCandidate } from "./question-validation";
import type { ConversationTurn } from "./prompt-config";

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
}): QuestionCandidate {
  const questionMetadata = metadata(input);
  const question = questionMetadata.conditionFocus === "neutral"
    ? neutralQuestions[(input.turn - 2) % neutralQuestions.length]
    : conditionQuestions[input.condition][Math.min(input.turn - 1, 3)];
  const candidate = { question, metadata: questionMetadata };
  const flags = validateQuestion({ ...input, ...candidate });
  if (flags.length > 0) throw new Error(`No valid fallback question for turn ${input.turn}: ${flags.join(",")}`);
  return candidate;
}
