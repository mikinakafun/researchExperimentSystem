import type { ResultRecord } from "./result";
import { RESULT_SCHEMA_VERSION } from "./result-storage";

const columns = [
  "session_id", "record_type", "saved_at", "schema_version", "protocol_version", "prompt_version",
  "condition", "language", "initial_fragment",
  ...Array.from({ length: 6 }, (_, index) => `question_${index + 1}`),
  ...Array.from({ length: 6 }, (_, index) => `answer_${index + 1}`),
  "question_metadata_json", "question_generation_json", "final_result", "narrative_annotations_json",
  "narrative_generation_json", "evaluation_json", "checks_json",
] as const;

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/gu, '""')}"`;
}

export const resultCsvHeader = columns.map(csvCell).join(",");

export function resultCsvRow(record: ResultRecord) {
  if (record.schemaVersion !== RESULT_SCHEMA_VERSION || record.questions.length !== 6 || record.answers.length !== 6) {
    throw new Error("Result does not match the CSV schema.");
  }
  return [
    record.sessionId, record.recordType, record.savedAt, record.schemaVersion, record.protocolVersion,
    record.narrativePromptVersion, record.condition, record.language, record.fragment,
    ...record.questions, ...record.answers, JSON.stringify(record.questionMetadata),
    JSON.stringify(record.questionGeneration), record.finalResult, JSON.stringify(record.narrativeSentences),
    JSON.stringify(record.narrativeGeneration), JSON.stringify(record.evaluation), JSON.stringify(record.checks),
  ].map(csvCell).join(",");
}
