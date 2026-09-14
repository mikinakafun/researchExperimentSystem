import { createResponse, jsonError, OpenAIRequestError, parseJsonObject } from "../openai";
import { fallbackQuestion } from "../fallback-questions";
import { allowFallback, buildFollowUpInstructions, PROMPT_CONFIG, type ConversationTurn, type PromptCondition, type QuestionMetadata, type TransitionReason } from "../prompt-config";
import { hasNoRecallAtLatestTurn, validateQuestion, type QuestionCandidate } from "../question-validation";
import { parseLanguage } from "../../../lib/language";

const conditions = new Set<PromptCondition>(["visual", "odor"]);

function parseCandidate(parsed: Record<string, unknown>): { candidate: QuestionCandidate; schemaFlags: string[] } {
  const schemaFlags: string[] = [];
  if (typeof parsed.question !== "string") schemaFlags.push("question_schema");
  if (typeof parsed.conditionFocus !== "string") schemaFlags.push("condition_focus_schema");
  if ("turnFunction" in parsed) schemaFlags.push("turn_function_removed");
  if ("nonRecallTransition" in parsed || "insufficientEvidenceTransition" in parsed) schemaFlags.push("transition_flags_removed");
  if (parsed.targetEvidenceId !== null && typeof parsed.targetEvidenceId !== "string") schemaFlags.push("target_evidence_schema");
  if (parsed.transitionReason !== null && parsed.transitionReason !== "non_recall" && parsed.transitionReason !== "insufficient_evidence") schemaFlags.push("transition_reason_schema");
  const metadata: QuestionMetadata = {
    conditionFocus: String(parsed.conditionFocus ?? "") as QuestionMetadata["conditionFocus"],
    targetEvidenceId: typeof parsed.targetEvidenceId === "string" ? parsed.targetEvidenceId : null,
    transitionReason: (parsed.transitionReason === "non_recall" || parsed.transitionReason === "insufficient_evidence")
      ? parsed.transitionReason as TransitionReason
      : null,
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
    let retryReason = "";
    const rejectionLog: Array<{ attempt: number; flags: string[]; question?: string; metadata?: QuestionMetadata }> = [];
    for (let attempt = 1; attempt <= PROMPT_CONFIG.maxFollowUpAttempts; attempt += 1) {
      try {
        const result = await createResponse({
          temperature: PROMPT_CONFIG.followUpTemperature,
          responseFormat: "follow-up",
          instructions: buildFollowUpInstructions(condition, turn, hasNoRecallAtLatestTurn(history), retryReason, language),
          input: JSON.stringify({
            language,
            turn,
            assignedCondition: condition,
            evidence: [
              { id: "fragment", text: fragment },
              ...history.map((item, index) => ({ id: `answer-${index + 1}`, text: item.answer })),
            ],
            previousTurns: history,
            lastAnswerWasNonRecall: hasNoRecallAtLatestTurn(history),
          }),
        });
        const parsed = parseJsonObject(result.text);
        const { candidate, schemaFlags } = parseCandidate(parsed);
        const flags = [...schemaFlags, ...validateQuestion({ ...candidate, condition, turn, fragment, history, language })];
        if (flags.length === 0) {
          return Response.json({ ...candidate, language, model: result.model, requestId: result.id, promptVersion: PROMPT_CONFIG.followUpVersion, source: "generated", fallbackReason: null, attempts: attempt, diagnostics: { rejections: rejectionLog } });
        }
        rejectionLog.push({ attempt, flags, question: candidate.question, metadata: candidate.metadata });
        console.warn("[follow-up validation]", JSON.stringify({ condition, turn, attempt, flags }));
        retryReason = flags.join(", ");
      } catch (error) {
        if (error instanceof OpenAIRequestError && !error.fallbackEligible) throw error;
        const flag = error instanceof Error ? error.message : "invalid_output";
        rejectionLog.push({ attempt, flags: [flag] });
        console.warn("[follow-up validation]", JSON.stringify({ condition, turn, attempt, flags: [flag] }));
        retryReason = flag;
      }
    }

    if (!allowFallback()) {
      throw new OpenAIRequestError(`OpenAI returned no valid question after ${PROMPT_CONFIG.maxFollowUpAttempts} attempts.`);
    }
    const candidate = fallbackQuestion({ condition, turn, fragment, history, language });
    return Response.json({ ...candidate, language, model: "fallback", requestId: null, promptVersion: PROMPT_CONFIG.followUpVersion, source: "fallback", fallbackReason: candidate.metadata.transitionReason ?? "generation_rejected", attempts: PROMPT_CONFIG.maxFollowUpAttempts, diagnostics: { rejections: rejectionLog } });
  } catch (error) {
    return jsonError(error);
  }
}
