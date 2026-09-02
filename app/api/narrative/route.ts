import { createResponse, jsonError, OpenAIRequestError, parseJsonObject } from "../openai";
import { buildNarrativeInstructions, PROMPT_CONFIG } from "../prompt-config";
import { validateNarrativeSentences, type NarrativeSentence } from "../../../lib/narrative";
import { joinNarrative, parseLanguage } from "../../../lib/language";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      fragment?: string;
      answers?: Array<{ question: string; answer: string }>;
      language?: unknown;
    };
    const language = parseLanguage(body?.language);
    if (
      !body || !language ||
      typeof body.fragment !== "string" || !body.fragment.trim() ||
      !Array.isArray(body.answers) ||
      body.answers.length !== PROMPT_CONFIG.followUpTurns ||
      body.answers.some((turn) => !turn || typeof turn.question !== "string" || !turn.question.trim() || typeof turn.answer !== "string" || !turn.answer.trim())
    ) {
      return Response.json({ error: "Invalid narrative request." }, { status: 400 });
    }

    const fragment = body.fragment as string;
    const answers = body.answers as Array<{ question: string; answer: string }>;
    let retryReason = "";
    const rejectionLog: Array<{ attempt: number; flags: string[] }> = [];
    for (let attempt = 1; attempt <= PROMPT_CONFIG.maxNarrativeAttempts; attempt += 1) {
      try {
        const result = await createResponse({
          temperature: PROMPT_CONFIG.narrativeTemperature,
          responseFormat: "narrative",
          instructions: buildNarrativeInstructions(retryReason, language),
          input: JSON.stringify({
            language,
            materials: [
              { id: "fragment", text: fragment },
              ...answers.map((item, index) => ({ id: `answer-${index + 1}`, text: item.answer })),
            ],
            questionContext: answers.map((item, index) => ({
              question: item.question,
              answerSourceId: `answer-${index + 1}`,
            })),
          }),
        });
        const parsed = parseJsonObject(result.text);
        const flags = validateNarrativeSentences(parsed?.sentences, answers.length, PROMPT_CONFIG.narrativeMaxSentences, language);
        if (flags.length === 0) {
          const sentences = (parsed.sentences as NarrativeSentence[]).map((sentence) => ({ ...sentence, text: sentence.text.trim() }));
          return Response.json({
            narrative: joinNarrative(sentences, language),
            language,
            sentences,
            model: result.model,
            requestId: result.id,
            promptVersion: PROMPT_CONFIG.version,
            attempts: attempt,
            diagnostics: { rejections: rejectionLog },
          });
        }
        rejectionLog.push({ attempt, flags });
        console.warn("[narrative validation]", JSON.stringify({ attempt, flags }));
        retryReason = flags.join(", ");
      } catch (error) {
        if (error instanceof OpenAIRequestError && [401, 403, 503].includes(error.status)) throw error;
        const flag = error instanceof Error ? error.message : "invalid_output";
        rejectionLog.push({ attempt, flags: [flag] });
        console.warn("[narrative validation]", JSON.stringify({ attempt, flags: [flag] }));
        retryReason = flag;
      }
    }
    throw new OpenAIRequestError(`OpenAI returned an invalid narrative after ${PROMPT_CONFIG.maxNarrativeAttempts} attempts.`);
  } catch (error) {
    return jsonError(error);
  }
}
