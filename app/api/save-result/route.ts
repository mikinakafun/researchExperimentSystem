import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const CSV_PATH = path.join(DATA_DIRECTORY, "results-v0.4.1.csv");
const PROTOCOL_VERSION = "v0.3.0-draft";
const PROMPT_VERSION = "prompt-catalog-v0.4.1-mock-draft";
const CONDITIONS = new Set(["standard", "visual", "odor"]);
const RECORD_TYPES = new Set(["participant", "batch_synthetic"]);
const FOLLOW_UP_TURNS = 6;

const columns = [
  "session_id",
  "record_type",
  "saved_at",
  "protocol_version",
  "prompt_version",
  "condition",
  "initial_fragment",
  ...Array.from({ length: FOLLOW_UP_TURNS }, (_, index) => `question_${index + 1}`),
  ...Array.from({ length: FOLLOW_UP_TURNS }, (_, index) => `answer_${index + 1}`),
  "question_metadata_json",
  "final_result",
  "narrative_evidence_json",
  "evaluation_json",
  "checks_json",
] as const;

type SaveResultBody = {
  sessionId?: string;
  recordType?: "participant" | "batch_synthetic";
  condition?: string;
  fragment?: string;
  questions?: string[];
  questionMetadata?: Array<Record<string, unknown> | null>;
  answers?: string[];
  finalResult?: string;
  narrativeSentences?: Array<{ text?: string; evidenceIds?: string[] }>;
  evaluation?: Record<string, number>;
  checks?: Record<string, number>;
};

let writeQueue = Promise.resolve();

function enqueueWrite<T>(task: () => Promise<T>) {
  const next = writeQueue.then(task, task);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/gu, '""')}"`;
}

function isValidRatingMap(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value).every((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 7),
  );
}

function isValidQuestionMetadata(value: unknown) {
  return Boolean(
    Array.isArray(value) &&
      value.length === FOLLOW_UP_TURNS &&
      value.every((item) => item && typeof item === "object" && !Array.isArray(item)),
  );
}

function isValidNarrativeEvidence(value: unknown) {
  return Boolean(
    Array.isArray(value) &&
      value.length >= 1 &&
      value.every((item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        typeof (item as { text?: unknown }).text === "string" &&
        Boolean((item as { text: string }).text.trim()) &&
        Array.isArray((item as { evidenceIds?: unknown }).evidenceIds) &&
        (item as { evidenceIds: unknown[] }).evidenceIds.length >= 1 &&
        (item as { evidenceIds: unknown[] }).evidenceIds.every((id) => typeof id === "string" && id.length > 0),
      ),
  );
}

function validateBody(body: SaveResultBody) {
  return Boolean(
    body.sessionId?.trim() &&
      body.fragment?.trim() &&
      body.finalResult?.trim() &&
      RECORD_TYPES.has(body.recordType ?? "participant") &&
      body.condition &&
      CONDITIONS.has(body.condition) &&
      Array.isArray(body.questions) &&
      body.questions.length === FOLLOW_UP_TURNS &&
      body.questions.every((question) => typeof question === "string" && question.trim()) &&
      isValidQuestionMetadata(body.questionMetadata) &&
      Array.isArray(body.answers) &&
      body.answers.length === FOLLOW_UP_TURNS &&
      body.answers.every((answer) => typeof answer === "string" && answer.trim()) &&
      isValidNarrativeEvidence(body.narrativeSentences) &&
      isValidRatingMap(body.evaluation) &&
      isValidRatingMap(body.checks),
  );
}

async function appendResult(body: SaveResultBody) {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  let existing = "";
  try {
    existing = await readFile(CSV_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  if (existing.split("\n").some((line) => line.startsWith(`${csvCell(body.sessionId)},`))) {
    return false;
  }

  const values = [
    body.sessionId,
    body.recordType ?? "participant",
    new Date().toISOString(),
    PROTOCOL_VERSION,
    PROMPT_VERSION,
    body.condition,
    body.fragment,
    ...(body.questions ?? []),
    ...(body.answers ?? []),
    JSON.stringify(body.questionMetadata ?? []),
    body.finalResult,
    JSON.stringify(body.narrativeSentences ?? []),
    JSON.stringify(body.evaluation ?? {}),
    JSON.stringify(body.checks ?? {}),
  ];
  const header = columns.map(csvCell).join(",");
  const row = values.map(csvCell).join(",");
  const prefix = existing.length === 0 ? `${header}\n` : existing.endsWith("\n") ? "" : "\n";
  await appendFile(CSV_PATH, `${prefix}${row}\n`, "utf8");
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as SaveResultBody;
    if (!validateBody(body)) {
      return Response.json({ error: "Invalid result payload." }, { status: 400 });
    }

    const saved = await enqueueWrite(() => appendResult(body));
    return Response.json({ saved, duplicate: !saved, path: "data/results-v0.4.1.csv" });
  } catch (error) {
    console.error("[result storage]", error);
    return Response.json({ error: "Could not save the result CSV." }, { status: 500 });
  }
}
