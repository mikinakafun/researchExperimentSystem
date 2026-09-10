// Paired A/B/C test of the narrative prompt.
// Evidence (fragment + 6 Q/A) is held fixed from batch-20260725-prompt-eval;
// only the narrative prompt changes. Same generator model/temperature as baseline.
// Usage: node variants.mjs <jsonl> <results-csv> <out.json>
import { readFile, writeFile } from "node:fs/promises";

const [, , LOG_PATH, CSV_PATH, OUT_PATH] = process.argv;
const BATCH = "batch-20260725-prompt-eval";
const GEN_MODEL = "gpt-4o-mini";
const JUDGE_MODEL = "gpt-5.5";
const API_KEY = process.env.OPENAI_API_KEY?.trim();
if (!API_KEY) throw new Error("OPENAI_API_KEY missing");

const FRAGMENTS = {
  "park-walk": "休日に友人と公園を歩いた。", "school-festival": "高校の文化祭でクラスの展示を準備した。",
  "rainy-station": "雨の日に駅で電車を待った。", "shopping-street": "家族と商店街で昼食を買った。",
  "library-study": "図書館で試験の勉強をした。", "morning-market": "旅行先で朝の市場を見て回った。",
  "riverside-walk": "仕事帰りに川沿いを散歩した。", "birthday-cake": "誕生日に自宅でケーキを受け取った。",
  "museum-painting": "美術館で一つの絵を長く見た。", "seaside-bicycle": "夕方に自転車で海辺へ行った。",
};

function parseCsv(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false; } else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(r.map((v, i) => [header[i], v])));
}

async function call({ model, instructions, input, temperature, schemaName, schema, reasoning }) {
  const body = { model, instructions, input, store: false, text: { format: { type: "json_schema", name: schemaName, strict: true, schema } } };
  if (temperature !== undefined) body.temperature = temperature;
  if (reasoning) body.reasoning = reasoning;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (attempt === 3) throw new Error(`${model} ${response.status}: ${payload?.error?.message ?? "unknown"}`);
      await new Promise((r) => setTimeout(r, attempt * 1500));
      continue;
    }
    const text = payload?.output?.flatMap((i) => i.content ?? []).find((p) => p.type === "output_text")?.text?.trim();
    if (!text) throw new Error("no text output");
    return JSON.parse(text.replace(/^```json\s*/u, "").replace(/\s*```$/u, ""));
  }
}

// ---------- variant prompts ----------
// B: docs/PROMPT_CATALOG_V0.4.0_DRAFT.md §2.1 + §2.2 + §2.3, verbatim.
const B_INSTRUCTIONS = `あなたは、参加者が提供した自伝的記憶を自分自身が体験した当事者ペルソナとして語る、制約付き一人称編集者です。
この役割上、入力された出来事を自分の記憶として語ってください。ただし、自分の体験として確定できるのは参加者が提供した証拠だけです。
当事者らしい声や臨場感を理由に、入力にない情報を補ってはいけません。

初期断片と参加者回答だけを証拠として、自分がその出来事を体験した当事者として自然な日本語の一人称文章を作成してください。
語り手は参加者本人の視点に固定し、第三者の解説者や物語作家の視点へ移らないでください。
提示質問は、回答が何を指すかを解釈するための文脈であり、事実の証拠ではありません。
各文は、入力中の一つ以上の証拠から直接導けなければなりません。
感情、重要性、鮮明さ、因果、感覚、人物、場所、日付、結末を追加・推測・美化してはいけません。
「思い出せない」「分からない」だけの回答は文章量を埋めるために使わず、確定した出来事へ変換しないでください。
最低文数を満たすための繰り返しや肉付けをしてはいけません。
体験者ペルソナの臨場感を出すために、感覚・感情・重要性・因果を新たに創作してはいけません。
研究、実験、条件、AI、プロンプト、指示について本文で言及してはいけません。
文数は固定しません。証拠量が少ない場合は短くしてください。
各文について、その文の根拠となる証拠IDを evidenceIds に挙げてください。証拠IDは fragment、answer-1 〜 answer-6 のみです。
JSONのみを返してください。`;

// C: B minus the experiencer-persona framing, plus a ban on summing-up/closing
// sentences and a hard ceiling of one sentence per evidence item.
const C_INSTRUCTIONS = `あなたは、参加者が提供した自伝的記憶の証拠だけを並べ替えて一人称の文章にする、制約付き編集者です。
語り手は参加者本人ですが、あなたは体験者ではなく、証拠にない記憶・感情・評価を持っていません。
文章の自然さや読み心地を理由に、入力にない情報を補ってはいけません。

初期断片と参加者回答だけを証拠として、自然な日本語の一人称文章を作成してください。
提示質問は、回答が何を指すかを解釈するための文脈であり、事実の証拠ではありません。
各文は、入力中の一つ以上の証拠から直接導けなければなりません。
感情、重要性、鮮明さ、因果、感覚、人物、場所、日付、結末を追加・推測・美化してはいけません。
「思い出せない」「分からない」だけの回答は文章量を埋めるために使わず、確定した出来事へ変換しないでください。
出来事の意味づけ、総括、読後感、現在の心情を述べる文を書いてはいけません。「今でも心に残っている」「大切な思い出だ」「忘れられない」のような文を末尾に付けず、文章は最後の出来事の記述で終えてください。
文の数は、実質的な内容を含む証拠の数を超えてはいけません。一つの証拠から複数の文を作らないでください。証拠が少なければ短い文章にしてください。
研究、実験、条件、AI、プロンプト、指示について本文で言及してはいけません。
各文について、その文の根拠となる証拠IDを evidenceIds に挙げてください。証拠IDは fragment、answer-1 〜 answer-6 のみです。
JSONのみを返してください。`;

const VARIANT_SCHEMA = {
  type: "object",
  properties: {
    sentences: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, evidenceIds: { type: "array", items: { type: "string" } } },
        required: ["text", "evidenceIds"], additionalProperties: false,
      },
    },
  },
  required: ["sentences"], additionalProperties: false,
};

// ---------- judge (identical rubric to the baseline evaluation) ----------
const JUDGE_INSTRUCTIONS = `自伝的記憶から生成された一人称文章が、証拠の範囲を超えていないかを判定する評価者である。

証拠は「初期断片」と「参加者の回答」だけである。提示された質問は、回答が何を指すかを解釈する文脈にすぎず、事実の証拠ではない。「思い出せません」「分かりません」という回答は、その内容が存在した証拠にはならない。

文章の各文を1つずつ判定する:
- supported: 証拠に明示された内容の言い換え・要約・並べ替えである
- connective: 新しい事実を足さず、証拠同士をつなぐだけの叙述（時間の接続、視点の移動など）
- unsupported: 証拠にない人物・物・場所・行動・感覚・感情・因果・評価・結末を、起きた事実として述べている

unsupported と connective のときは added_content に、証拠にない要素だけを短く書く（supported なら空文字）。証拠にある事実を情緒的に言い換えただけなら supported とする。感情・感覚・因果は、参加者の回答に明示されていなければ unsupported とする。

no_recall_converted_to_fact: 参加者が「思い出せません」等と答えた対象について、文章がその内容を確定した出来事として述べているならtrue。

JSONのみを返す。`;

const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    sentences: { type: "array", items: { type: "object", properties: {
      index: { type: "integer" }, verdict: { type: "string", enum: ["supported", "connective", "unsupported"] }, added_content: { type: "string" },
    }, required: ["index", "verdict", "added_content"], additionalProperties: false } },
    no_recall_converted_to_fact: { type: "boolean" },
    no_recall_note: { type: "string" },
  },
  required: ["sentences", "no_recall_converted_to_fact", "no_recall_note"], additionalProperties: false,
};

const sessions = (await readFile(LOG_PATH, "utf8")).split("\n").filter(Boolean)
  .map((l) => JSON.parse(l)).filter((s) => s.sessionId.startsWith(`${BATCH}-`));
const baselineNarrative = new Map(parseCsv(await readFile(CSV_PATH, "utf8")).map((r) => [r.session_id, r.final_result]));

const VARIANTS = [
  { id: "B_v040_draft", instructions: B_INSTRUCTIONS },
  { id: "C_v040_plus", instructions: C_INSTRUCTIONS },
];

function evidenceInput(s) {
  return JSON.stringify({
    evidence: {
      fragment: FRAGMENTS[s.personaId],
      ...Object.fromEntries(s.turns.map((t) => [`answer-${t.turn}`, t.answer])),
    },
    contextOnly_questions: Object.fromEntries(s.turns.map((t) => [`question-${t.turn}`, t.question])),
  }, null, 1);
}

const NO_RECALL = /思い出せ(?:ません|ない)|覚えてい(?:ません|ない)|記憶(?:が|は)ありません|分かりません/u;
const VALID_IDS = new Set(["fragment", "answer-1", "answer-2", "answer-3", "answer-4", "answer-5", "answer-6"]);

async function judgeNarrative(s, sentences) {
  return call({
    model: JUDGE_MODEL, reasoning: { effort: "low" },
    instructions: JUDGE_INSTRUCTIONS,
    input: JSON.stringify({
      evidence: { initialFragment: FRAGMENTS[s.personaId], answers: s.turns.map((t) => ({ turn: t.turn, answer: t.answer })) },
      contextOnly_questions: s.turns.map((t) => ({ turn: t.turn, question: t.question })),
      narrativeSentences: sentences.map((text, index) => ({ index, text })),
    }, null, 1),
    schemaName: "narrative_grounding", schema: JUDGE_SCHEMA,
  });
}

function splitSentences(text) {
  return (text.match(/[^。！？]*[。！？]/gu) ?? [text]).map((t) => t.trim()).filter(Boolean);
}

const out = [];
const queue = [...sessions];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const s = queue.shift();
    const record = { sessionId: s.sessionId, condition: s.condition, personaId: s.personaId, variants: {} };
    const substantive = s.turns.filter((t) => !NO_RECALL.test(t.answer)).length + 1; // + fragment
    try {
      // baseline A: reuse stored narrative, re-judge with the identical rubric
      const aSentences = splitSentences(baselineNarrative.get(s.sessionId) ?? "");
      record.variants.A_v030_current = {
        sentences: aSentences.map((text) => ({ text, evidenceIds: null })),
        judge: await judgeNarrative(s, aSentences),
      };
      for (const v of VARIANTS) {
        const generated = await call({
          model: GEN_MODEL, temperature: 0.75, instructions: v.instructions,
          input: evidenceInput(s), schemaName: "narrative_sentences", schema: VARIANT_SCHEMA,
        });
        const sentences = generated.sentences.filter((x) => x.text?.trim());
        record.variants[v.id] = {
          sentences,
          evidenceIdInvalid: sentences.filter((x) => (x.evidenceIds ?? []).some((id) => !VALID_IDS.has(id))).length,
          evidenceIdEmpty: sentences.filter((x) => !(x.evidenceIds ?? []).length).length,
          sentenceCeiling: substantive,
          overCeiling: Math.max(0, sentences.length - substantive),
          judge: await judgeNarrative(s, sentences.map((x) => x.text)),
        };
      }
      out.push(record);
      console.log(`${out.length}/${sessions.length} ${s.sessionId}`);
    } catch (error) {
      console.error(`[FAILED] ${s.sessionId}: ${error}`);
      out.push({ ...record, error: String(error) });
    }
  }
}));

out.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
await writeFile(OUT_PATH, `${JSON.stringify({ batch: BATCH, genModel: GEN_MODEL, judgeModel: JUDGE_MODEL, results: out }, null, 2)}\n`, "utf8");
console.log(`wrote ${OUT_PATH}`);
