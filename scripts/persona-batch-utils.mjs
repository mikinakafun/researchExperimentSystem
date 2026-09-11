export function generationMetadata(payload) {
  const { model, requestId, promptVersion, source, attempts, settings, diagnostics } = payload;
  return { model, requestId, promptVersion, source, attempts, settings, diagnostics };
}
