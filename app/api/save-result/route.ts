import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PROMPT_CONFIG } from "../prompt-config";
import { validateNarrativeSentences, type NarrativeSentence } from "../../../lib/narrative";
import { joinNarrative, parseLanguage } from "../../../lib/language";
import { RESULT_CSV_FILENAME, RESULT_CSV_PATH } from "../../../lib/result-storage";

export const runtime = "nodejs";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const CSV_PATH = path.join(DATA_DIRECTORY, RESULT_CSV_FILENAME);
const PROTOCOL_VERSION = "v0.4.0-draft";
const PROMPT_VERSION = PROMPT_CONFIG.version;
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
  "language",
  "initial_fragment",
  ...Array.from({ length: FOLLOW_UP_TURNS }, (_, index) => `question_${index + 1}`),
  ...Array.from({ length: FOLLOW_UP_TURNS }, (_, index) => `answer_${index + 1}`),
  "question_metadata_json",
  "final_result",
  "narrative_annotations_json",
  "evaluation_json",
  "checks_json",
] as const;

type SaveResultBody = {
  language?: unknown;
  sessionId?: string;
  recordType?: "participant" | "batch_synthetic";
  condition?: string;
  fragment?: string;
  questions?: string[];
  questionMetadata?: Array<Record<string, unknown> | null>;
  answers?: string[];
  finalResult?: string;
  narrativeSentences?: NarrativeSentence[];
  narrativePromptVersion?: string;
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

function validateBody(body: SaveResultBody) {
  const language = parseLanguage(body?.language);
  return Boolean(
    body && language && body.sessionId?.trim() &&
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
      body.narrativePromptVersion === PROMPT_VERSION &&
      validateNarrativeSentences(body.narrativeSentences, FOLLOW_UP_TURNS, PROMPT_CONFIG.narrativeMaxSentences, language).length === 0 &&
      joinNarrative(body.narrativeSentences!, language) === body.finalResult &&
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
    parseLanguage(body.language),
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
  if (existing && existing.split(/\r?\n/u)[0] !== header) throw new Error("Result CSV header does not match the bilingual schema.");
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
    return Response.json({ saved, duplicate: !saved, language: parseLanguage(body.language), path: RESULT_CSV_PATH });
  } catch (error) {
    console.error("[result storage]", error);
    return Response.json({ error: "Could not save the result CSV." }, { status: 500 });
  }
}
