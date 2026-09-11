export function generationMetadata(payload) {
  const { model, requestId, promptVersion, source, fallbackReason, attempts, settings, diagnostics } = payload;
  return {
    model,
    requestId,
    promptVersion,
    source,
    ...(fallbackReason === undefined ? {} : { fallbackReason }),
    attempts,
    settings,
    diagnostics,
  };
}
