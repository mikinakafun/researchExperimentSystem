import { createResponse, jsonError, OpenAIRequestError, InvalidModelOutputError, parseJsonObject } from "../openai";
import { fallbackQuestion } from "../fallback-questions";
import { buildFollowUpInstructions, PROMPT_CONFIG, type ConversationTurn, type PromptCondition, type QuestionMetadata } from "../prompt-config";
import { hasNoRecallAtLatestTurn, validateQuestion, type QuestionCandidate } from "../question-validation";
import { parseLanguage } from "../../../lib/language";

const conditions = new Set<PromptCondition>(["visual", "odor"]);

function parseCandidate(parsed: Record<string, unknown>): { candidate: QuestionCandidate; schemaFlags: string[] } {
  const schemaFlags: string[] = [];
  if (typeof parsed.question !== "string") schemaFlags.push("question_schema");
  if (typeof parsed.conditionFocus !== "string") schemaFlags.push("condition_focus_schema");
  if (parsed.targetEvidenceId !== null && typeof parsed.targetEvidenceId !== "string") schemaFlags.push("target_evidence_schema");
  if (parsed.transitionReason !== undefined && typeof parsed.transitionReason !== "string") schemaFlags.push("transition_reason_schema");
  const metadata: QuestionMetadata = {
    conditionFocus: String(parsed.conditionFocus ?? "") as QuestionMetadata["conditionFocus"],
    targetEvidenceId: typeof parsed.targetEvidenceId === "string" ? parsed.targetEvidenceId : null,
    ...(typeof parsed.transitionReason === "string" ? { transitionReason: parsed.transitionReason as QuestionMetadata["transitionReason"] } : {}),
  };
  return { candidate: { question: typeof parsed.question === "string" ? parsed.question.trim() : "", metadata }, schemaFlags };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      condition?: string;
      fragment?: string;
      history?: Array<{ question: string; answer: string }>;
      turn?: number;
      language?: unknown;
    };
    const language = parseLanguage(body?.language);
    if (
      !body || !language ||
      !body.condition || !conditions.has(body.condition as PromptCondition) ||
      typeof body.fragment !== "string" || !body.fragment.trim() || !Array.isArray(body.history) ||
      typeof body.turn !== "number" || !Number.isInteger(body.turn) || body.turn < 1 || body.turn > PROMPT_CONFIG.followUpTurns ||
      body.history.some((turn) => !turn || typeof turn.question !== "string" || !turn.question.trim() || typeof turn.answer !== "string" || !turn.answer.trim()) ||
      body.history.length !== body.turn - 1
    ) {
      return Response.json({ error: "Invalid follow-up request." }, { status: 400 });
    }

    const condition = body.condition as PromptCondition;
    const turn = body.turn as number;
    const fragment = body.fragment as string;
    const history = body.history as ConversationTurn[];
    const rejectionLog: Array<{ attempt: number; stage: "candidate" | "repair"; candidateIndex?: number; flags: string[]; question?: string; metadata?: QuestionMetadata; model?: string; requestId?: string | null }> = [];
    const settings = { temperature: PROMPT_CONFIG.followUpTemperature, candidateCount: PROMPT_CONFIG.followUpCandidateCount, repairCount: PROMPT_CONFIG.followUpRepairCount, maxAttempts: PROMPT_CONFIG.maxFollowUpAttempts };
    const baseInput = JSON.stringify({ language, turn, assignedCondition: condition, evidence: [{ id: "fragment", text: fragment }, ...history.map((item, index) => ({ id: `answer-${index + 1}`, text: item.answer }))], previousTurns: history, lastAnswerWasNonRecall: hasNoRecallAtLatestTurn(history) });
    const instruction = buildFollowUpInstructions(condition, turn, hasNoRecallAtLatestTurn(history), undefined, language);
    const results = await Promise.all(Array.from({ length: settings.candidateCount }, async (_, index) => {
      let candidateResponse: Awaited<ReturnType<typeof createResponse>> | null = null;
      try {
        candidateResponse = await createResponse({ temperature: settings.temperature, responseFormat: "follow-up", instructions: instruction, input: baseInput });
        const { candidate, schemaFlags } = parseCandidate(parseJsonObject(candidateResponse.text));
        const flags = [...schemaFlags, ...validateQuestion({ ...candidate, condition, turn, fragment, history, language })];
        return { index, result: candidateResponse, candidate, flags };
      } catch (error) {
        if (error instanceof OpenAIRequestError) throw error;
        const flag = error instanceof Error ? error.message : "invalid_output";
        return { index, result: candidateResponse, candidate: { question: "", metadata: { conditionFocus: condition, targetEvidenceId: null } }, flags: [flag] };
      }
    }));
    const valid = results.find((item) => item.flags.length === 0);
    for (const item of results) if (!valid || item.index !== valid.index) {
      rejectionLog.push({ attempt: item.index + 1, stage: "candidate", candidateIndex: item.index, flags: item.flags.length ? item.flags : ["candidate_not_selected"], question: item.candidate.question, metadata: item.candidate.metadata, ...(item.result ? { model: item.result.model, requestId: item.result.id } : {}) });
    }
    if (valid) return Response.json({ ...valid.candidate, language, model: valid.result!.model, requestId: valid.result!.id, promptVersion: PROMPT_CONFIG.followUpVersion, source: "generated", attempts: settings.candidateCount, settings, diagnostics: { rejections: rejectionLog } });

    const repairTarget = results[0];
    let repairResponse: Awaited<ReturnType<typeof createResponse>> | null = null;
    try {
      repairResponse = await createResponse({ temperature: 0, responseFormat: "follow-up", instructions: buildFollowUpInstructions(condition, turn, hasNoRecallAtLatestTurn(history), repairTarget.flags.join(", "), language), input: JSON.stringify({ ...JSON.parse(baseInput), rejectedCandidate: repairTarget.candidate, violations: repairTarget.flags }) });
      const { candidate, schemaFlags } = parseCandidate(parseJsonObject(repairResponse.text));
      const flags = [...schemaFlags, ...validateQuestion({ ...candidate, condition, turn, fragment, history, language })];
      if (flags.length === 0) return Response.json({ ...candidate, language, model: repairResponse.model, requestId: repairResponse.id, promptVersion: PROMPT_CONFIG.followUpVersion, source: "generated", attempts: settings.candidateCount + 1, settings, diagnostics: { rejections: rejectionLog } });
      rejectionLog.push({ attempt: settings.candidateCount + 1, stage: "repair", candidateIndex: 0, flags, question: candidate.question, metadata: candidate.metadata, model: repairResponse.model, requestId: repairResponse.id });
    } catch (error) {
      if (error instanceof OpenAIRequestError) throw error;
      if (!(error instanceof InvalidModelOutputError)) throw error;
      rejectionLog.push({ attempt: settings.candidateCount + 1, stage: "repair", candidateIndex: 0, flags: [error.message], ...(repairResponse ? { model: repairResponse.model, requestId: repairResponse.id } : {}) });
    }
    const candidate = fallbackQuestion({ condition, turn, fragment, history, language });
    const fallbackReason = hasNoRecallAtLatestTurn(history) ? "non_recall" : candidate.metadata.conditionFocus === "neutral" ? "insufficient_evidence" : "generation_rejected";
    return Response.json({ ...candidate, language, model: "fallback", requestId: null, promptVersion: PROMPT_CONFIG.followUpVersion, source: "fallback", fallbackReason, attempts: settings.candidateCount + 1, settings, diagnostics: { rejections: rejectionLog } });
  } catch (error) {
    return jsonError(error);
  }
}
