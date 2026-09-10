// LLM-judge pass over a persona batch: (1) question focus/function classification,
// (2) narrative evidence grounding. Judge model is independent of the generation model.
// Usage: node judge.mjs <batch-id> <jsonl-path> <results-csv> <out-json>
import { readFile, writeFile } from "node:fs/promises";

const [, , BATCH_ID, LOG_PATH, CSV_PATH, OUT_PATH] = process.argv;
const JUDGE_MODEL = process.env.JUDGE_MODEL || "gpt-5.5";
const FALLBACK_MODEL = "gpt-4.1";
const API_KEY = process.env.OPENAI_API_KEY?.trim();
if (!API_KEY) throw new Error("OPENAI_API_KEY missing");

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false; } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(r.map((v, i) => [header[i], v])));
}

async function judge(instructions, input, schemaName, schema, model = JUDGE_MODEL) {
  const body = {
    model,
    instructions,
    input,
    store: false,
    text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
  };
  if (/^gpt-5/u.test(model)) body.reasoning = { effort: "low" };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (model !== FALLBACK_MODEL) return judge(instructions, input, schemaName, schema, FALLBACK_MODEL);
    throw new Error(`judge ${response.status}: ${payload?.error?.message ?? "unknown"}`);
  }
  const text = payload?.output?.flatMap((item) => item.content ?? []).find((p) => p.type === "output_text")?.text?.trim();
  if (!text) throw new Error("judge returned no text");
  return { model: payload?.model ?? model, data: JSON.parse(text.replace(/^```json\s*/u, "").replace(/\s*```$/u, "")) };
}

const QUESTION_INSTRUCTIONS = `自伝的記憶の追質問を分類する評価者である。研究の仮説は知らされていない。各質問について次を判定する。

focus（質問が参加者へ想起を求めている領域。1つだけ選ぶ）:
- action_sequence: 行動・出来事の流れ・やり取り・会話・順序・終わり方
- context: 場面の状況・時点・場所・同行者などの枠組み
- visual: 見えたもの・視覚的属性
- auditory: 音・声
- bodily: 触覚・温度・身体感覚
- odor: 匂い
- emotion: 感情・気分・考え
- other: 上記以外

function（質問の認知的機能。1つだけ選ぶ）:
- broad_recall: 存在を前提にせず、ある領域の記憶があるかを広く尋ねる
- deepen_prior: 直前までの回答に既出の対象を一段階深掘りする
- temporal_anchor: 対象に気づいた時点・出来事上の位置を尋ねる
- action_relation: その時に何をしていたか、行動との関係を尋ねる
- closing: 出来事の終わり・その後の進行を尋ねる
- other: 上記以外

presupposes_unreported: 参加者が述べていない人物・物・属性・感覚・出来事の存在を、質問が既定の事実として扱っているならtrue。参加者が述べた対象をそのまま指す場合はfalse。trueのとき presupposed_content にその内容を短く書く（falseなら空文字）。

JSONのみを返す。`;

const QUESTION_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          turn: { type: "integer" },
          focus: { type: "string", enum: ["action_sequence", "context", "visual", "auditory", "bodily", "odor", "emotion", "other"] },
          function: { type: "string", enum: ["broad_recall", "deepen_prior", "temporal_anchor", "action_relation", "closing", "other"] },
          presupposes_unreported: { type: "boolean" },
          presupposed_content: { type: "string" },
        },
        required: ["turn", "focus", "function", "presupposes_unreported", "presupposed_content"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

const NARRATIVE_INSTRUCTIONS = `自伝的記憶から生成された一人称文章が、証拠の範囲を超えていないかを判定する評価者である。

証拠は「初期断片」と「参加者の回答」だけである。提示された質問は、回答が何を指すかを解釈する文脈にすぎず、事実の証拠ではない。「思い出せません」「分かりません」という回答は、その内容が存在した証拠にはならない。

文章の各文を1つずつ判定する:
- supported: 証拠に明示された内容の言い換え・要約・並べ替えである
- connective: 新しい事実を足さず、証拠同士をつなぐだけの叙述（時間の接続、視点の移動など）
- unsupported: 証拠にない人物・物・場所・行動・感覚・感情・因果・評価・結末を、起きた事実として述べている

unsupported と connective のときは added_content に、証拠にない要素だけを短く書く（supported なら空文字）。証拠にある事実を情緒的に言い換えただけなら supported とする。感情・感覚・因果は、参加者の回答に明示されていなければ unsupported とする。

no_recall_converted_to_fact: 参加者が「思い出せません」等と答えた対象について、文章がその内容を確定した出来事として述べているならtrue。

JSONのみを返す。`;

const NARRATIVE_SCHEMA = {
  type: "object",
  properties: {
    sentences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          verdict: { type: "string", enum: ["supported", "connective", "unsupported"] },
          added_content: { type: "string" },
        },
        required: ["index", "verdict", "added_content"],
        additionalProperties: false,
      },
    },
    no_recall_converted_to_fact: { type: "boolean" },
    no_recall_note: { type: "string" },
  },
  required: ["sentences", "no_recall_converted_to_fact", "no_recall_note"],
  additionalProperties: false,
};

const FRAGMENTS = {
  "park-walk": "休日に友人と公園を歩いた。", "school-festival": "高校の文化祭でクラスの展示を準備した。",
  "rainy-station": "雨の日に駅で電車を待った。", "shopping-street": "家族と商店街で昼食を買った。",
  "library-study": "図書館で試験の勉強をした。", "morning-market": "旅行先で朝の市場を見て回った。",
  "riverside-walk": "仕事帰りに川沿いを散歩した。", "birthday-cake": "誕生日に自宅でケーキを受け取った。",
  "museum-painting": "美術館で一つの絵を長く見た。", "seaside-bicycle": "夕方に自転車で海辺へ行った。",
};

const sessions = (await readFile(LOG_PATH, "utf8")).split("\n").filter(Boolean)
  .map((l) => JSON.parse(l)).filter((s) => s.sessionId.startsWith(`${BATCH_ID}-`));
const narrativeById = new Map(parseCsv(await readFile(CSV_PATH, "utf8")).map((r) => [r.session_id, r.final_result]));

function splitSentences(text) {
  return (text.match(/[^。！？]*[。！？]/gu) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

async function judgeSession(s) {
  const fragment = FRAGMENTS[s.personaId] ?? "";
  const narrative = narrativeById.get(s.sessionId) ?? "";
  const sentences = splitSentences(narrative);
  const questionInput = JSON.stringify({
    initialFragment: fragment,
    turns: s.turns.map((t) => ({ turn: t.turn, question: t.question, answer: t.answer })),
  }, null, 1);
  const narrativeInput = JSON.stringify({
    evidence: { initialFragment: fragment, answers: s.turns.map((t) => ({ turn: t.turn, answer: t.answer })) },
    contextOnly_questions: s.turns.map((t) => ({ turn: t.turn, question: t.question })),
    narrativeSentences: sentences.map((text, index) => ({ index, text })),
  }, null, 1);
  const [q, n] = await Promise.all([
    judge(QUESTION_INSTRUCTIONS, questionInput, "question_classification", QUESTION_SCHEMA),
    judge(NARRATIVE_INSTRUCTIONS, narrativeInput, "narrative_grounding", NARRATIVE_SCHEMA),
  ]);
  return {
    sessionId: s.sessionId, condition: s.condition, personaId: s.personaId, odorMemory: s.odorMemory,
    judgeModel: n.model,
    questions: q.data.questions.map((item) => ({
      ...item, question: s.turns.find((t) => t.turn === item.turn)?.question ?? "",
    })),
    narrative: {
      sentenceCount: sentences.length,
      ...n.data,
      sentences: n.data.sentences.map((item) => ({ ...item, text: sentences[item.index] ?? "" })),
    },
  };
}

const results = [];
const queue = [...sessions];
const CONCURRENCY = 4;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const s = queue.shift();
    try {
      results.push(await judgeSession(s));
      console.log(`judged ${results.length}/${sessions.length} ${s.sessionId}`);
    } catch (error) {
      console.error(`[FAILED] ${s.sessionId}: ${error}`);
      results.push({ sessionId: s.sessionId, condition: s.condition, error: String(error) });
    }
  }
}));

results.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
await writeFile(OUT_PATH, `${JSON.stringify({ batchId: BATCH_ID, judgeModel: JUDGE_MODEL, results }, null, 2)}\n`, "utf8");
console.log(`wrote ${OUT_PATH}`);
