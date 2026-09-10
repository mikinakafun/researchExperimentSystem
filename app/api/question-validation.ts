import {
  TURN_FUNCTIONS,
  type ConditionFocus,
  type ConversationTurn,
  type PromptCondition,
  type QuestionMetadata,
} from "./prompt-config";
import { matchesOutputLanguage, type Language } from "../../lib/language";
import { studyDisclosurePattern } from "../../lib/content-validation";

export type QuestionCandidate = {
  question: string;
  metadata: QuestionMetadata;
};

export type QuestionValidationInput = QuestionCandidate & {
  condition: PromptCondition;
  turn: number;
  fragment: string;
  history: ConversationTurn[];
  language?: Language;
};

const odorPattern = /(?:匂い|におい|香り|臭い|\b(?:smells?|smelled|smelt|scents?|odou?rs?|aromas?|fragrances?)\b)/iu;
const visualPattern = /(?:見え|見た|見える|目に入|光景|景色|色|明る|暗|形|光|配置|外見|見た目|\b(?:visual|see|seeing|seen|saw|looks?|looked|appearance|colou?rs?|brightness|bright|dark|shapes?|lights?|arrangements?)\b)/iu;
const auditoryPattern = /(?:音|声|聞こ|\b(?:auditory|sounds?|voices?|hear|hearing|heard)\b)/iu;
const bodilyPattern = /(?:触|感触|手触り|温度|湿度|熱|温か|暖か|冷た|冷え|寒|暑|身体|体(?:に|で|の|が|を|は)|肌|痛|疲れ|緊張|\b(?:bodily|body|touch|touched|textures?|temperatures?|sensations?|warm|cold|hot|pain|tired)\b)/iu;
const emotionPattern = /(?:気持ち|考え|感情|気分|どう感じ|どのように感じ|どんな(?:ことを)?感じ|\b(?:emotions?|moods?|feelings?|thoughts?)\b|\bhow\b.*\b(?:feel|felt)\b)/iu;
const sensoryPattern = new RegExp(`${visualPattern.source}|${auditoryPattern.source}|${bodilyPattern.source}|${odorPattern.source}|雰囲気|空気|味|食感|表情|\\b(?:atmosphere|air|taste|flavou?rs?|expressions?)\\b`, "iu");
const noRecallPattern = /(?:思い出せ(?:ません|ない|なかった)|覚えてい(?:ません|ない)|記憶(?:が|は)(?:ありません|ない)|分かりません|分からない|わかりません|わからない|覚えがありません|\bno\s+(?:memory|recall|odou?r|smell)\b|\b(?:do(?:\s+not|n['’]t)|did(?:\s+not|n['’]t)|cannot|can\s+not|can['’]t|could(?:\s+not|n['’]t))\s+(?:remember|recall|know)\b)/iu;
// DEC-049: olfactory perception is object-based, so naming what an odor was an
// odor of reports the percept rather than inferring it. Only explicit requests
// to reason about a cause remain violations.
const sourceInferencePattern = /(?:原因|なぜ|どうして|推測|想像|\b(?:why|guess|infer|imagine|causes?|caused)\b)/iu;

export function saysNoRecall(text: string) {
  return noRecallPattern.test(text);
}

export function hasNoRecallAtLatestTurn(history: ConversationTurn[]) {
  return history.length > 0 && saysNoRecall(history[history.length - 1].answer);
}

function normalize(text: string) {
  return text.normalize("NFKC").replace(/\s+/gu, "").replace(/[？?。！!、,「」『』]/gu, "").toLowerCase();
}

function validEvidenceIds(turn: number) {
  return new Set(["fragment", ...Array.from({ length: Math.max(0, turn - 1) }, (_, index) => `answer-${index + 1}`)]);
}

function validateMetadata(input: QuestionValidationInput) {
  const flags: string[] = [];
  const metadata = input.metadata;
  const focuses: ConditionFocus[] = ["standard", "visual", "odor", "neutral"];
  // Validate the output contract, not a prescribed sequence or wording.
  if (!focuses.includes(metadata.conditionFocus)) flags.push("invalid_condition_focus");
  if (!Object.values(TURN_FUNCTIONS).includes(metadata.turnFunction)) flags.push("invalid_turn_function");
  if (metadata.nonRecallTransition && metadata.insufficientEvidenceTransition) flags.push("multiple_transitions");
  if (metadata.targetEvidenceId !== null && !validEvidenceIds(input.turn).has(metadata.targetEvidenceId)) {
    flags.push("invalid_target_evidence_id");
  }
  if (metadata.conditionFocus === "neutral") {
    if (!metadata.nonRecallTransition && !metadata.insufficientEvidenceTransition) flags.push("neutral_without_transition");
    if (metadata.targetEvidenceId !== null) flags.push("neutral_target_must_be_null");
  } else {
    if (metadata.conditionFocus !== input.condition) flags.push("condition_focus_mismatch");
    if (metadata.nonRecallTransition || metadata.insufficientEvidenceTransition) flags.push("focused_question_with_transition");
  }
  return flags;
}

export function validateQuestion(input: QuestionValidationInput): string[] {
  const question = input.question.trim();
  const flags = validateMetadata(input);
  const previousQuestions = input.history.map((turn) => normalize(turn.question));

  if (!question) flags.push("empty");
  if (studyDisclosurePattern.test(question)) flags.push("study_disclosure");
  if (input.language && !matchesOutputLanguage(question, input.language)) flags.push("output_language_mismatch");
  if (previousQuestions.includes(normalize(question))) flags.push("duplicate");

  // These patterns detect explicit cross-condition wording only. Missing a
  // keyword is not a violation; semantic condition fidelity needs evaluation.
  if (input.metadata.conditionFocus === "neutral") {
    if (sensoryPattern.test(question) || emotionPattern.test(question)) flags.push("neutral_focus_contamination");
  }

  if (input.condition === "standard" && input.metadata.conditionFocus !== "neutral") {
    if (sensoryPattern.test(question)) flags.push("standard_sensory_contamination");
    if (emotionPattern.test(question)) flags.push("standard_emotion_focus");
  }

  if (input.condition === "visual" && input.metadata.conditionFocus !== "neutral") {
    if (odorPattern.test(question)) flags.push("visual_odor_contamination");
    if (auditoryPattern.test(question) || bodilyPattern.test(question) || emotionPattern.test(question)) flags.push("visual_condition_contamination");
  }

  if (input.condition === "odor" && input.metadata.conditionFocus !== "neutral") {
    if (visualPattern.test(question) || auditoryPattern.test(question) || bodilyPattern.test(question) || emotionPattern.test(question)) flags.push("odor_condition_contamination");
    if (sourceInferencePattern.test(question)) flags.push("odor_source_inference");
  }

  return [...new Set(flags)];
}
