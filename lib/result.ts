import type { Language } from "./language";
import type { NarrativeSentence } from "./narrative";
import type { GenerationMetadata } from "./generation";

export type ResultData = {
  sessionId: string;
  recordType: "participant" | "batch_synthetic";
  condition: "standard" | "visual" | "odor";
  language: Language;
  fragment: string;
  questions: string[];
  questionMetadata: Record<string, unknown>[];
  questionGeneration: GenerationMetadata[];
  answers: string[];
  finalResult: string;
  narrativeSentences: NarrativeSentence[];
  narrativePromptVersion: string;
  narrativeGeneration: GenerationMetadata;
  evaluation: Record<string, number>;
  checks: Record<string, number>;
};

export type ResultRecord = ResultData & {
  savedAt: string;
  protocolVersion: string;
  schemaVersion: string;
};

export type SaveOutcome = { saved: boolean; duplicate: boolean };

// A database adapter can implement this boundary without changing the UI
// payload or HTTP validation. File operations belong to the local adapter.
export interface ResultStore {
  save(record: ResultRecord): Promise<SaveOutcome>;
}
