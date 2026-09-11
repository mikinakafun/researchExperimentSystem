// Browser-safe extraction. Missing diagnostics must never become a fabricated
// successful attempt or an empty rejection history.
export type GenerationRejection = {
  attempt: number;
  stage: "candidate" | "repair";
  candidateIndex?: number;
  flags: string[];
  question?: string;
  metadata?: Record<string, unknown>;
  model?: string;
  requestId?: string | null;
};

export type GenerationMetadata = {
  model: string;
  requestId: string | null;
  promptVersion: string;
  source: "generated" | "fallback";
  fallbackReason?: "generation_rejected" | "non_recall" | "insufficient_evidence";
  attempts: number;
  settings: { temperature: number; candidateCount: number; repairCount: number; maxAttempts: number };
  diagnostics: { rejections: GenerationRejection[] };
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function readGenerationMetadata(value: unknown): GenerationMetadata | null {
  if (!isObject(value) || !isNonEmptyString(value.model) ||
      !(value.requestId === null || isNonEmptyString(value.requestId)) ||
      !isNonEmptyString(value.promptVersion) ||
      (value.source !== "generated" && value.source !== "fallback") ||
      typeof value.attempts !== "number" || !Number.isInteger(value.attempts) || value.attempts < 1 ||
      !isObject(value.diagnostics) || !Array.isArray(value.diagnostics.rejections)) return null;

  const rejections: GenerationRejection[] = [];
  for (const item of value.diagnostics.rejections) {
    if (!isObject(item) || typeof item.attempt !== "number" ||
        !Number.isInteger(item.attempt) || item.attempt < 1 ||
        (item.stage !== "candidate" && item.stage !== "repair") ||
        !Array.isArray(item.flags) || !item.flags.length || !item.flags.every(isNonEmptyString) ||
        (item.question !== undefined && typeof item.question !== "string") ||
      (item.metadata !== undefined && !isObject(item.metadata)) ||
      (item.model !== undefined && !isNonEmptyString(item.model)) ||
      (item.requestId !== undefined && item.requestId !== null && !isNonEmptyString(item.requestId))) return null;
    rejections.push({
      attempt: item.attempt, stage: item.stage,
      flags: [...item.flags],
      ...(item.question === undefined ? {} : { question: item.question }),
      ...(item.metadata === undefined ? {} : { metadata: { ...item.metadata } }),
      ...(item.model === undefined ? {} : { model: item.model }),
      ...(item.requestId === undefined ? {} : { requestId: item.requestId }),
    });
  }
  if (rejections.length !== (value.source === "generated" ? value.attempts - 1 : value.attempts)) return null;
  if (value.source === "fallback" && (value.model !== "fallback" || value.requestId !== null)) return null;
  if (!isObject(value.settings) || typeof value.settings.temperature !== "number" || typeof value.settings.candidateCount !== "number" || typeof value.settings.repairCount !== "number" || typeof value.settings.maxAttempts !== "number") return null;
  return {
    model: value.model,
    requestId: value.requestId,
    promptVersion: value.promptVersion,
    source: value.source,
    ...(value.fallbackReason === undefined ? {} : { fallbackReason: value.fallbackReason as GenerationMetadata["fallbackReason"] }),
    attempts: value.attempts,
    settings: { temperature: value.settings.temperature, candidateCount: value.settings.candidateCount, repairCount: value.settings.repairCount, maxAttempts: value.settings.maxAttempts },
    diagnostics: { rejections },
  };
}
