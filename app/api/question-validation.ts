import {
  TURN_FUNCTIONS,
  type ConditionFocus,
  type ConversationTurn,
  type PromptCondition,
  type QuestionMetadata,
} from "./prompt-config";

export type QuestionCandidate = {
  question: string;
  metadata: QuestionMetadata;
};

export type QuestionValidationInput = QuestionCandidate & {
  condition: PromptCondition;
  turn: number;
  fragment: string;
  history: ConversationTurn[];
};

const odorPattern = /(?:匂い|におい|香り|臭い|smell|scent|odor|odour|aroma|fragrance)/iu;
const visualPattern = /(?:見え|見た|見える|目に入|光景|景色|色|明る|暗|形|光|配置|外見|見た目|visual|see|saw|look|appearance)/iu;
const auditoryPattern = /(?:音|声|聞こ|auditory|sound|voice|hear|heard)/iu;
const bodilyPattern = /(?:触|感触|手触り|温度|湿度|熱|温か|暖か|冷た|冷え|寒|暑|身体|体(?:に|で|の|が|を|は)|肌|痛|疲れ|緊張|bodily|body|touch|texture|temperature|sensation)/iu;
const emotionPattern = /(?:気持ち|考え|感情|気分|どう感じ|印象|emotion|mood|feeling|thought)/iu;
const eventPattern = /(?:出来事|行動|何をし|何が起き|やり取り|会話|順序|時点|その時|前後|相手|歩|待|話|立ち|座|準備|買|行|来|戻|食|乗|作業|event|action|interaction|sequence)/iu;
const sensoryPattern = new RegExp(`${visualPattern.source}|${auditoryPattern.source}|${bodilyPattern.source}|${odorPattern.source}|雰囲気|空気|味|食感|表情`, "iu");
const noRecallPattern = /(?:思い出せ(?:ません|ない|なかった)|覚えてい(?:ません|ない)|記憶(?:が|は)(?:ありません|ない)|分かりません|分からない|わかりません|わからない|覚えがありません|no\s+(?:memory|recall|odor|smell)|do(?:\s+not|n't)\s+(?:remember|know))/iu;
const disclosurePattern = /(?:Standard|Visual|Odor|Neutral|条件|仮説|実験|研究|割り?付け|AI|プロンプト|condition|hypothesis|experiment|study|prompt)/iu;
const multipleRequestPattern = /(?:または|それとも|および|及び|ならびに|並びに|\bor\b|\band\b)/iu;
const saliencePattern = /(?:最も|一番|印象的|目立|重要|鮮明|はっきり|most|salient|important|vivid)/iu;
const sourceInferencePattern = /(?:どこから|何から|発生源|原因|なぜ|どうして|推測|想像|what caused|where.*from|guess|infer|imagine)/iu;

export function saysNoRecall(text: string) {
  return noRecallPattern.test(text);
}

export function hasNoRecallAtLatestTurn(history: ConversationTurn[]) {
  return history.length > 0 && saysNoRecall(history[history.length - 1].answer);
}

function normalize(text: string) {
  return text.normalize("NFKC").replace(/\s+/gu, "").replace(/[？?。！!、,「」『』]/gu, "").toLowerCase();
}

function reportedMaterial(input: QuestionValidationInput) {
  return [input.fragment, ...input.history.map((turn) => turn.answer)].join("\n");
}

function validEvidenceIds(turn: number) {
  return new Set(["fragment", ...Array.from({ length: Math.max(0, turn - 1) }, (_, index) => `answer-${index + 1}`)]);
}

function evidenceText(input: QuestionValidationInput, evidenceId: string) {
  if (evidenceId === "fragment") return input.fragment;
  const match = evidenceId.match(/^answer-(\d+)$/u);
  if (!match) return "";
  return input.history[Number(match[1]) - 1]?.answer ?? "";
}

function focusPattern(condition: PromptCondition) {
  if (condition === "visual") return visualPattern;
  if (condition === "odor") return odorPattern;
  return eventPattern;
}

function validateMetadata(input: QuestionValidationInput) {
  const flags: string[] = [];
  const metadata = input.metadata;
  const focuses: ConditionFocus[] = ["standard", "visual", "odor", "neutral"];
  const expectedFunction = TURN_FUNCTIONS[input.turn];
  const lastAnswerWasNonRecall = hasNoRecallAtLatestTurn(input.history);

  if (!focuses.includes(metadata.conditionFocus)) flags.push("invalid_condition_focus");
  if (metadata.turnFunction !== expectedFunction) flags.push("turn_function_mismatch");
  if (metadata.nonRecallTransition && metadata.insufficientEvidenceTransition) flags.push("multiple_transitions");

  if (input.turn === 1) {
    if (metadata.conditionFocus !== input.condition) flags.push("turn_one_focus_mismatch");
    if (metadata.targetEvidenceId !== null) flags.push("turn_one_target_must_be_null");
    if (metadata.nonRecallTransition || metadata.insufficientEvidenceTransition) flags.push("turn_one_transition");
    return flags;
  }

  if (metadata.conditionFocus === "neutral") {
    if (!metadata.nonRecallTransition && !metadata.insufficientEvidenceTransition) flags.push("neutral_without_transition");
    if (metadata.targetEvidenceId !== null) flags.push("neutral_target_must_be_null");
  } else {
    if (metadata.conditionFocus !== input.condition) flags.push("condition_focus_mismatch");
    if (metadata.nonRecallTransition || metadata.insufficientEvidenceTransition) flags.push("focused_question_with_transition");
    if (!metadata.targetEvidenceId || !validEvidenceIds(input.turn).has(metadata.targetEvidenceId)) flags.push("invalid_target_evidence_id");
    if (metadata.targetEvidenceId && !focusPattern(input.condition).test(evidenceText(input, metadata.targetEvidenceId))) {
      flags.push("target_evidence_focus_mismatch");
    }
    if (
      input.turn === 5 &&
      metadata.targetEvidenceId &&
      input.history.slice(1, 4).some((item) => item.metadata?.targetEvidenceId === metadata.targetEvidenceId)
    ) {
      flags.push("second_target_reuses_prior_target");
    }
  }

  if (metadata.nonRecallTransition && !lastAnswerWasNonRecall) flags.push("non_recall_transition_without_non_recall");
  if (metadata.insufficientEvidenceTransition && input.turn < 5) flags.push("insufficient_evidence_transition_too_early");
  if (lastAnswerWasNonRecall && metadata.conditionFocus === "neutral" && !metadata.nonRecallTransition) flags.push("non_recall_transition_missing");
  if (lastAnswerWasNonRecall && metadata.targetEvidenceId === `answer-${input.turn - 1}`) flags.push("non_recall_answer_targeted");
  return flags;
}

export function validateQuestion(input: QuestionValidationInput): string[] {
  const question = input.question.trim();
  const flags = validateMetadata(input);
  const questionMarks = question.match(/[？?]/gu) ?? [];
  const previousQuestions = input.history.map((turn) => normalize(turn.question));
  const material = reportedMaterial(input);

  if (!question) flags.push("empty");
  if (question.length > 80) flags.push("too_long");
  if (questionMarks.length !== 1) flags.push("question_count");
  if (disclosurePattern.test(question)) flags.push("study_disclosure");
  if (multipleRequestPattern.test(question)) flags.push("multiple_requests");
  if (saliencePattern.test(question)) flags.push("salience_or_evaluation_focus");
  if (previousQuestions.includes(normalize(question))) flags.push("duplicate");

  if (input.metadata.conditionFocus === "neutral") {
    if (sensoryPattern.test(question) || emotionPattern.test(question)) flags.push("neutral_focus_contamination");
    if (!eventPattern.test(question)) flags.push("neutral_event_focus_missing");
  }

  if (input.condition === "standard" && input.metadata.conditionFocus !== "neutral") {
    if (sensoryPattern.test(question)) flags.push("standard_sensory_contamination");
    if (emotionPattern.test(question)) flags.push("standard_emotion_focus");
    if (!eventPattern.test(question)) flags.push("standard_event_focus_missing");
  }

  if (input.condition === "visual" && input.metadata.conditionFocus !== "neutral") {
    if (odorPattern.test(question)) flags.push("visual_odor_contamination");
    if (auditoryPattern.test(question) || bodilyPattern.test(question) || emotionPattern.test(question)) flags.push("visual_condition_contamination");
    if (!visualPattern.test(question)) flags.push("visual_focus_missing");
    if (/(?:何色|どんな色|色は|色を|何の形|どんな形|何人|いくつ|大きさ|明るさ|配置|what color|what shape|how many|what size|how bright)/iu.test(question) && !/(?:色|赤|青|緑|黄|黒|白|形|人数|何人|明る|暗|配置|color|shape|number|size|bright)/iu.test(material)) {
      flags.push("unreported_visual_attribute");
    }
  }

  if (input.condition === "odor" && input.metadata.conditionFocus !== "neutral") {
    if (visualPattern.test(question) || auditoryPattern.test(question) || bodilyPattern.test(question) || emotionPattern.test(question)) flags.push("odor_condition_contamination");
    if (!odorPattern.test(question)) flags.push("odor_focus_missing");
    if (sourceInferencePattern.test(question)) flags.push("odor_source_inference");
  }

  if (input.turn === 1) {
    if (input.condition === "visual") {
      if (/(?:どんな|どのような|その)(?:景色|光景|見た目|もの)|(?:景色|光景).*(?:広が|見え)|見えていた/u.test(question)) flags.push("visual_presence_presupposition");
      if (!/^(?:その時|その場面で)[、,]?(?:周囲に)?何か.*(?:見え|目に入)/u.test(question)) flags.push("visual_existence_neutrality_missing");
    }
    if (input.condition === "odor") {
      if (/(?:どんな|どのような|その|感じた)(?:匂い|におい)|(?:匂い|におい)を感じ/u.test(question)) flags.push("odor_presence_presupposition");
      if (!/^(?:その時|その場面で)[、,]?何か.*(?:匂い|におい)/u.test(question)) flags.push("odor_existence_neutrality_missing");
    }
  }

  return [...new Set(flags)];
}
