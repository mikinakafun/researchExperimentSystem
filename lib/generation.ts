// Browser-safe extraction. Missing diagnostics must never become a fabricated
// successful attempt or an empty rejection history.
export type GenerationRejection = {
  attempt: number;
  flags: string[];
  question?: string;
  metadata?: Record<string, unknown>;
};

export type GenerationMetadata = {
  model: string;
  requestId: string | null;
  promptVersion: string;
  source: "generated" | "fallback";
  attempts: number;
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
        !Number.isInteger(item.attempt) || item.attempt !== rejections.length + 1 ||
        !Array.isArray(item.flags) || !item.flags.length || !item.flags.every(isNonEmptyString) ||
        (item.question !== undefined && typeof item.question !== "string") ||
        (item.metadata !== undefined && !isObject(item.metadata))) return null;
    rejections.push({
      attempt: item.attempt,
      flags: [...item.flags],
      ...(item.question === undefined ? {} : { question: item.question }),
      ...(item.metadata === undefined ? {} : { metadata: { ...item.metadata } }),
    });
  }
  if (rejections.length !== value.attempts - (value.source === "generated" ? 1 : 0)) return null;
  if (value.source === "fallback" && (value.model !== "fallback" || value.requestId !== null)) return null;
  return {
    model: value.model,
    requestId: value.requestId,
    promptVersion: value.promptVersion,
    source: value.source,
    attempts: value.attempts,
    diagnostics: { rejections },
  };
}
