import { createResponse, jsonError, OpenAIRequestError, parseJsonObject } from "../openai";
import { buildNarrativeInstructions, PROMPT_CONFIG } from "../prompt-config";
import { saysNoRecall } from "../question-validation";

type NarrativeSentence = {
  text: string;
  evidenceIds: string[];
};

const disclosurePattern = /(?:Standard|Visual|Odor|Neutral|条件|仮説|実験|研究|AI|プロンプト|condition|hypothesis|experiment|study|prompt)/iu;

function parseSentences(parsed: Record<string, unknown>) {
  if (!Array.isArray(parsed.sentences)) return [];
  return parsed.sentences.map((item): NarrativeSentence => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { text: "", evidenceIds: [] };
    const record = item as Record<string, unknown>;
    return {
      text: typeof record.text === "string" ? record.text.trim() : "",
      evidenceIds: Array.isArray(record.evidenceIds)
        ? record.evidenceIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  });
}

function validateSentences(
  sentences: NarrativeSentence[],
  answers: Array<{ question: string; answer: string }>,
) {
  const flags: string[] = [];
  const allowedIds = new Set(["fragment", ...answers.map((_, index) => `answer-${index + 1}`)]);
  const noRecallIds = new Set(
    answers.flatMap((item, index) => saysNoRecall(item.answer) ? [`answer-${index + 1}`] : []),
  );
  if (sentences.length < 1 || sentences.length > PROMPT_CONFIG.narrativeMaxSentences) flags.push("sentence_count");
  if (new Set(sentences.map((sentence) => sentence.text)).size !== sentences.length) flags.push("duplicate_sentence");
  sentences.forEach((sentence, index) => {
    if (!sentence.text) flags.push(`sentence_${index + 1}_empty`);
    if ((sentence.text.match(/[。！？!?]/gu) ?? []).length !== 1) flags.push(`sentence_${index + 1}_punctuation`);
    if (disclosurePattern.test(sentence.text)) flags.push(`sentence_${index + 1}_disclosure`);
    if (sentence.evidenceIds.length < 1) flags.push(`sentence_${index + 1}_empty_evidence`);
    if (new Set(sentence.evidenceIds).size !== sentence.evidenceIds.length) flags.push(`sentence_${index + 1}_duplicate_evidence`);
    if (sentence.evidenceIds.some((id) => !allowedIds.has(id))) flags.push(`sentence_${index + 1}_unknown_evidence`);
    if (sentence.evidenceIds.some((id) => noRecallIds.has(id))) flags.push(`sentence_${index + 1}_non_recall_evidence`);
  });
  return [...new Set(flags)];
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      fragment?: string;
      answers?: Array<{ question: string; answer: string }>;
    };
    if (
      !body.fragment?.trim() ||
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
          instructions: buildNarrativeInstructions(retryReason),
          input: JSON.stringify({
            evidence: [
              { id: "fragment", text: fragment },
              ...answers.map((item, index) => ({ id: `answer-${index + 1}`, text: item.answer })),
            ],
            questionContext: answers.map((item, index) => ({
              question: item.question,
              answerEvidenceId: `answer-${index + 1}`,
            })),
          }),
        });
        const sentences = parseSentences(parseJsonObject(result.text));
        const flags = validateSentences(sentences, answers);
        if (flags.length === 0) {
          return Response.json({
            narrative: sentences.map((sentence) => sentence.text).join(""),
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
