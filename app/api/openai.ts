type OpenAIOutputItem = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type OpenAIResponse = {
  id?: string;
  model?: string;
  output?: OpenAIOutputItem[];
  error?: { message?: string };
};

export const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAIRequestError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "OpenAIRequestError";
    this.status = status;
  }
}

export function configuredModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export async function createResponse(input: {
  instructions: string;
  input: string;
  temperature: number;
  responseFormat?: "follow-up" | "narrative";
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenAIRequestError(
      "OPENAI_API_KEY is not configured on the server.",
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: configuredModel(),
        instructions: input.instructions,
        input: input.input,
        temperature: input.temperature,
        store: false,
        ...(input.responseFormat ? {
          text: {
            format: input.responseFormat === "narrative"
              ? {
                  type: "json_schema",
                  name: "narrative_sentences",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      sentences: {
                        type: "array",
                        minItems: 1,
                        maxItems: 10,
                        items: {
                          type: "object",
                          properties: {
                            text: { type: "string" },
                            sourceIds: {
                              type: "array",
                              items: { type: "string" },
                            },
                            containsCreativeAddition: { type: "boolean" },
                          },
                          required: ["text", "sourceIds", "containsCreativeAddition"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["sentences"],
                    additionalProperties: false,
                  },
                }
              : {
                  type: "json_schema",
                  name: "followup_question",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      conditionFocus: { type: "string", enum: ["standard", "visual", "odor", "neutral"] },
                      turnFunction: { type: "string", enum: ["broad_recall", "grounded_detail", "temporal_anchor", "action_relation", "second_grounded_detail", "unresolved_attribute"] },
                      targetEvidenceId: { anyOf: [{ type: "string" }, { type: "null" }] },
                      nonRecallTransition: { type: "boolean" },
                      insufficientEvidenceTransition: { type: "boolean" },
                    },
                    required: ["question", "conditionFocus", "turnFunction", "targetEvidenceId", "nonRecallTransition", "insufficientEvidenceTransition"],
                    additionalProperties: false,
                  },
                },
          },
        } : {}),
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null) as OpenAIResponse | null;
    if (!response.ok) {
      const providerMessage = payload?.error?.message?.trim();
      throw new OpenAIRequestError(
        providerMessage || `OpenAI API request failed with status ${response.status}.`,
        response.status === 401 ? 502 : response.status,
      );
    }

    const text = payload?.output
      ?.flatMap((item) => item.content ?? [])
      .find((part) => part.type === "output_text")
      ?.text
      ?.trim();
    if (!text) {
      throw new OpenAIRequestError("OpenAI API returned no text output.");
    }

    return {
      id: payload?.id ?? null,
      model: payload?.model ?? configuredModel(),
      text,
    };
  } catch (error) {
    if (error instanceof OpenAIRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenAIRequestError("OpenAI API request timed out.", 504);
    }
    throw new OpenAIRequestError("Could not reach the OpenAI API.");
  } finally {
    clearTimeout(timeout);
  }
}

export function jsonError(error: unknown) {
  const status = error instanceof OpenAIRequestError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected API error.";
  return Response.json({ error: message }, { status });
}

export function parseJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/u, "").replace(/\s*```$/u, "");
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new OpenAIRequestError("OpenAI API returned invalid JSON.");
  }
}
