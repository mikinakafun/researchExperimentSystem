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

export type FallbackReason = "generation_rejected" | "non_recall" | "insufficient_evidence";

export type GenerationMetadata = {
  model: string;
  requestId: string | null;
  promptVersion: string;
  source: "generated" | "fallback";
  fallbackReason?: FallbackReason;
  attempts: number;
  settings: GenerationSettings;
  diagnostics: { rejections: GenerationRejection[] };
};

export type GenerationSettings = {
  temperature: number;
  candidateCount: number;
  repairCount: number;
  maxAttempts: number;
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isGenerationSettings(value: unknown): value is GenerationSettings {
  if (!isObject(value) || typeof value.temperature !== "number" || typeof value.candidateCount !== "number" ||
      typeof value.repairCount !== "number" || typeof value.maxAttempts !== "number") return false;
  return Number.isFinite(value.temperature) && value.temperature >= 0 &&
    Number.isInteger(value.candidateCount) && value.candidateCount >= 1 &&
    Number.isInteger(value.repairCount) && value.repairCount >= 0 &&
    Number.isInteger(value.maxAttempts) && value.maxAttempts >= 1;
}

export function readGenerationMetadata(value: unknown): GenerationMetadata | null {
  if (!isObject(value) || !isNonEmptyString(value.model) ||
      !(value.requestId === null || isNonEmptyString(value.requestId)) ||
      !isNonEmptyString(value.promptVersion) ||
      (value.source !== "generated" && value.source !== "fallback") ||
      typeof value.attempts !== "number" || !Number.isInteger(value.attempts) || value.attempts < 1 ||
      !isObject(value.diagnostics) || !Array.isArray(value.diagnostics.rejections)) return null;

  const settings = value.settings;
  if (!isGenerationSettings(settings) || value.attempts > settings.maxAttempts) return null;

  const isFallback = value.source === "fallback";
  const fallbackReasons = new Set<FallbackReason>(["generation_rejected", "non_recall", "insufficient_evidence"]);
  if (isFallback) {
    if (!fallbackReasons.has(value.fallbackReason as FallbackReason) || value.model !== "fallback" || value.requestId !== null) return null;
  } else if (value.fallbackReason !== undefined || value.requestId === null || value.model === "fallback") {
    return null;
  }

  const rejections: GenerationRejection[] = [];
  const seenAttempts = new Set<number>();
  for (const item of value.diagnostics.rejections) {
    if (!isObject(item) || typeof item.attempt !== "number" ||
        !Number.isInteger(item.attempt) || item.attempt < 1 || item.attempt > value.attempts || seenAttempts.has(item.attempt) ||
        (item.stage !== "candidate" && item.stage !== "repair") ||
        (item.candidateIndex !== undefined && (typeof item.candidateIndex !== "number" || !Number.isInteger(item.candidateIndex) || item.candidateIndex < 0)) ||
        !Array.isArray(item.flags) || !item.flags.length || !item.flags.every(isNonEmptyString) ||
        (item.question !== undefined && typeof item.question !== "string") ||
      (item.metadata !== undefined && !isObject(item.metadata)) ||
      (item.model !== undefined && !isNonEmptyString(item.model)) ||
      (item.requestId !== undefined && item.requestId !== null && !isNonEmptyString(item.requestId))) return null;
    seenAttempts.add(item.attempt);
    rejections.push({
      attempt: item.attempt, stage: item.stage,
      ...(item.candidateIndex === undefined ? {} : { candidateIndex: item.candidateIndex }),
      flags: [...item.flags],
      ...(item.question === undefined ? {} : { question: item.question }),
      ...(item.metadata === undefined ? {} : { metadata: { ...item.metadata } }),
      ...(item.model === undefined ? {} : { model: item.model }),
      ...(item.requestId === undefined ? {} : { requestId: item.requestId }),
    });
  }
  if (rejections.length !== (value.source === "generated" ? value.attempts - 1 : value.attempts)) return null;
  return {
    model: value.model,
    requestId: value.requestId,
    promptVersion: value.promptVersion,
    source: value.source,
    ...(isFallback ? { fallbackReason: value.fallbackReason as FallbackReason } : {}),
    attempts: value.attempts,
    settings: { temperature: settings.temperature, candidateCount: settings.candidateCount, repairCount: settings.repairCount, maxAttempts: settings.maxAttempts },
    diagnostics: { rejections },
  };
}
