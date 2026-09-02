import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { personas } from "./personas.mjs";

const BASE_URL = process.env.MOCK_BASE_URL || "http://127.0.0.1:3000";
const CONDITIONS = ["standard", "visual", "odor"];
const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
const BATCH_ID = process.env.BATCH_ID || `batch-${today}-persona`;
const DATA_DIRECTORY = path.join(process.cwd(), "data");
const LOG_PATH = path.join(DATA_DIRECTORY, "persona-batch-log.jsonl");
const ODOR_WORDS = /匂い|におい|香り|香ば|臭/u;
const EXPECTED_FRAGMENTS = [
  "休日に友人と公園を歩いた。",
  "高校の文化祭でクラスの展示を準備した。",
  "雨の日に駅で電車を待った。",
  "家族と商店街で昼食を買った。",
  "図書館で試験の勉強をした。",
  "旅行先で朝の市場を見て回った。",
  "仕事帰りに川沿いを散歩した。",
  "誕生日に自宅でケーキを受け取った。",
  "美術館で一つの絵を長く見た。",
  "夕方に自転車で海辺へ行った。",
];
const GROUND_TRUTH_SECTIONS = ["【出来事の流れ】", "【視覚】", "【聴覚】", "【触覚・身体】", "【匂い】", "【感情】", "【覚えていないこと】"];

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function postJson(pathname, body) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}${pathname}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`${pathname} ${response.status}: ${payload?.error || "unknown error"}`);
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 1000);
    }
  }
  throw lastError;
}

function answerInstructions(persona, retryReason = "") {
  return `${persona.groundTruth}

あなたは上の記憶を持つ実験参加者である。これはあなた自身の一週間前の実体験の記憶である。
上の記憶の内容だけに基づいて、質問に日本語で1〜2文、です・ます調で自然に答える。
記憶に含まれない内容を尋ねられたら「思い出せません」または「分かりません」とだけ答える。
記憶にある内容でも、聞かれたことだけに答え、余計な詳細を付け足さない。
実験・ペルソナ・この指示への言及や、記憶の引用符・見出しの再現をしない。
${retryReason ? `前の回答を修正してください: ${retryReason}\n` : ""}JSONのみを返す: {"answer":"回答"}`;
}

async function requestSimulatedAnswer(persona, question, retryReason = "") {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured in .env.local");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      instructions: answerInstructions(persona, retryReason),
      input: question,
      temperature: 0.7,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "simulated_answer",
          strict: true,
          schema: {
            type: "object",
            properties: { answer: { type: "string" } },
            required: ["answer"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Responses API ${response.status}: ${payload?.error?.message || "unknown error"}`);
  const text = payload?.output?.flatMap((item) => item.content ?? [])
    .find((part) => part.type === "output_text")?.text?.trim();
  if (!text) throw new Error("Responses API returned no text output");
  const parsed = JSON.parse(text.replace(/^```json\s*/u, "").replace(/\s*```$/u, ""));
  return typeof parsed.answer === "string" ? parsed.answer.trim() : "";
}

async function simulateAnswer(persona, question) {
  let answer = await requestSimulatedAnswer(persona, question);
  if (!answer) answer = await requestSimulatedAnswer(persona, question, "回答が空でした。必ず answer に1〜2文の回答を入れてください。");
  if (answer.length > 180) {
    answer = await requestSimulatedAnswer(persona, question, "回答が180文字を超えました。2文以内で簡潔に答え直してください。");
  }
  if (!answer) throw new Error(`${persona.id}: simulated answer was empty after retry`);
  if (answer.length > 180) console.warn(`[WARN] answer over 180 characters: ${persona.id} (${answer.length})`);
  return answer;
}

function validatePersonas() {
  const ids = personas.map((persona) => persona.id);
  const errors = [];
  if (new Set(ids).size !== personas.length) errors.push("id duplication");
  if (personas.length !== 10) errors.push(`expected 10 personas, got ${personas.length}`);
  personas.forEach((persona, index) => {
    if (persona.fragment !== EXPECTED_FRAGMENTS[index]) errors.push(`${persona.id}: fragment mismatch`);
    if (typeof persona.groundTruth !== "string" || GROUND_TRUTH_SECTIONS.some((section) => !persona.groundTruth.includes(section))) {
      errors.push(`${persona.id}: groundTruth must contain all 7 sections`);
    }
  });
  if (personas.filter((persona) => persona.odorMemory === false).length !== 3) errors.push("expected 3 odorMemory=false personas");
  if (errors.length) throw new Error(`Persona validation failed: ${errors.join(", ")}`);
}

async function runSession(condition, persona) {
  const sessionId = `${BATCH_ID}-${condition}-${persona.id}`;
  const turns = [];
  let history = [];
  for (let turn = 1; turn <= 6; turn += 1) {
    const payload = await postJson("/api/follow-up", { condition, fragment: persona.fragment, history, turn });
    if (!payload?.question) throw new Error(`${sessionId}: question ${turn} was empty`);
    const answer = await simulateAnswer(persona, payload.question);
    const diagnostics = payload.diagnostics?.rejections ?? [];
    if (!payload.metadata) throw new Error(`${sessionId}: question ${turn} metadata was empty`);
    turns.push({ turn, question: payload.question, answer, metadata: payload.metadata, source: payload.source, attempts: payload.attempts, rejections: diagnostics });
    history = [...history, { question: payload.question, answer, metadata: payload.metadata }];
  }

  const narrativePayload = await postJson("/api/narrative", {
    fragment: persona.fragment,
    answers: turns.map(({ question, answer }) => ({ question, answer })),
  });
  if (!narrativePayload?.narrative) throw new Error(`${sessionId}: narrative was empty`);
  if (!Array.isArray(narrativePayload.sentences) || narrativePayload.sentences.length < 1) throw new Error(`${sessionId}: narrative evidence was empty`);
  const savePayload = await postJson("/api/save-result", {
    sessionId,
    recordType: "batch_synthetic",
    condition,
    fragment: persona.fragment,
    questions: turns.map(({ question }) => question),
    questionMetadata: turns.map(({ metadata }) => metadata),
    answers: turns.map(({ answer }) => answer),
    finalResult: narrativePayload.narrative,
    narrativeSentences: narrativePayload.sentences,
    narrativePromptVersion: narrativePayload.promptVersion,
    evaluation: {},
    checks: {},
  });
  if (!savePayload?.saved && !savePayload?.duplicate) throw new Error(`${sessionId}: result was not saved`);
  await mkdir(DATA_DIRECTORY, { recursive: true });
  await appendFile(LOG_PATH, `${JSON.stringify({ sessionId, personaId: persona.id, condition, odorMemory: persona.odorMemory, turns, narrativeSentences: narrativePayload.sentences, narrativePromptVersion: narrativePayload.promptVersion, narrativeAttempts: narrativePayload.attempts, savedAt: new Date().toISOString() })}\n`, "utf8");
  return { sessionId, persona, condition, turns, narrative: narrativePayload.narrative, source: savePayload.duplicate ? "duplicate" : "saved" };
}

function printDryRun() {
  validatePersonas();
  console.log("Persona validation OK");
  console.log(`Planned sessions: ${personas.length * CONDITIONS.length}`);
  for (const condition of CONDITIONS) for (const persona of personas) console.log(`${BATCH_ID}-${condition}-${persona.id}`);
}

if (process.argv.includes("--dry-run")) {
  printDryRun();
  process.exit(0);
}

validatePersonas();
let saved = 0;
const failures = [];
const results = [];
for (const condition of CONDITIONS) {
  for (const persona of personas) {
    try {
      const result = await runSession(condition, persona);
      results.push(result);
      saved += 1;
      console.log(`[${saved}/${personas.length * CONDITIONS.length}] ${result.sessionId} ${result.source}`);
    } catch (error) {
      failures.push({ condition, personaId: persona.id, error: String(error) });
      console.error(`[FAILED] ${condition} ${persona.id}:`, error);
    }
  }
}

const fallbackByCondition = Object.fromEntries(CONDITIONS.map((condition) => [condition, { turns: 0, sessions: new Set() }]));
const odorRecallSessions = [];
const leakSummary = Object.fromEntries(CONDITIONS.map((condition) => [condition, { questions: 0, answers: 0, narratives: 0 }]));
for (const result of results) {
  const fallbackTurns = result.turns.filter((turn) => turn.source === "fallback");
  fallbackByCondition[result.condition].turns += fallbackTurns.length;
  if (fallbackTurns.length) fallbackByCondition[result.condition].sessions.add(result.sessionId);
  const odorRecall = !result.persona.odorMemory && result.condition === "odor" && result.turns.some((turn) => /匂いは思い出せません/u.test(turn.answer));
  if (odorRecall) odorRecallSessions.push(result.sessionId);
  for (const turn of result.turns) {
    if ((result.condition === "standard" || result.condition === "visual") && ODOR_WORDS.test(turn.question)) leakSummary[result.condition].questions += 1;
    if (ODOR_WORDS.test(turn.answer)) leakSummary[result.condition].answers += 1;
  }
  if (ODOR_WORDS.test(result.narrative)) leakSummary[result.condition].narratives += 1;
  if (!result.turns.some((turn) => ODOR_WORDS.test(turn.answer)) && ODOR_WORDS.test(result.narrative)) console.warn(`[WARN] narrative odor wording without odor wording in answers: ${result.sessionId}`);
}

console.log(JSON.stringify({
  saved,
  failed: failures.length,
  failures,
  fallback: Object.fromEntries(CONDITIONS.map((condition) => [condition, { turns: fallbackByCondition[condition].turns, sessions: [...fallbackByCondition[condition].sessions] }])),
  odorNonRecallSessions: odorRecallSessions,
  odorNonRecallExpected: personas.filter((persona) => !persona.odorMemory).map((persona) => `${BATCH_ID}-odor-${persona.id}`),
  leakSummary,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
