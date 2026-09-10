// Variant D: v0.4.0 content constraints + explicit rewriting licence (merge, reorder,
// unify register, temporal connectives) and a ban on verbatim copying / one-sentence-per-answer listing.
// Usage: node variant-d.mjs <jsonl> <variants.json> <out.json>
import { readFile, writeFile } from "node:fs/promises";

const [, , LOG_PATH, VARIANTS_PATH, OUT_PATH] = process.argv;
const BATCH = "batch-20260725-prompt-eval";
const API_KEY = process.env.OPENAI_API_KEY?.trim();
if (!API_KEY) throw new Error("OPENAI_API_KEY missing");

const FRAGMENTS = {
  "park-walk": "休日に友人と公園を歩いた。", "school-festival": "高校の文化祭でクラスの展示を準備した。",
  "rainy-station": "雨の日に駅で電車を待った。", "shopping-street": "家族と商店街で昼食を買った。",
  "library-study": "図書館で試験の勉強をした。", "morning-market": "旅行先で朝の市場を見て回った。",
  "riverside-walk": "仕事帰りに川沿いを散歩した。", "birthday-cake": "誕生日に自宅でケーキを受け取った。",
  "museum-painting": "美術館で一つの絵を長く見た。", "seaside-bicycle": "夕方に自転車で海辺へ行った。",
};

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

const D_INSTRUCTIONS = `あなたは、参加者が提供した自伝的記憶の証拠だけを材料に、読みやすい一人称の回想文へ書き直す、制約付き編集者です。
語り手は参加者本人ですが、あなたは体験者ではなく、証拠にない記憶・感情・評価を持っていません。

証拠は初期断片と参加者回答だけです。提示質問は、回答が何を指すかを解釈するための文脈であり、事実の証拠ではありません。

してよいこと（文章として自然にするために必要な編集）:
- 複数の証拠を一つの文にまとめる。時間順に並べ替える。
- 文体を「です・ます」に統一し、口調のばらつきをならす。
- 事実を足さない接続（その後、次に、〜してから、など）を補う。
- 重複した内容を一度にまとめ、同じことを繰り返さない。
- 回答の語をそのまま並べず、自分の言葉で言い直す。

してはいけないこと:
- 証拠にない人物、物、場所、日付、行動、感覚、感情、因果、重要性、結末を書く。
- 「思い出せない」「分からない」という回答を、確定した出来事へ変換する。文章量を埋めるために使わない。
- 出来事の意味づけ、総括、読後感、現在の心情を述べる文を書く。「今でも心に残っている」「大切な思い出だ」のような文を末尾に付けない。文章は最後の出来事の記述で終える。
- 回答文をほぼそのまま引き写す。1つの回答につき1文を並べただけの箇条書き的な文章にする。
- 文数を稼ぐために内容を薄く分割する。証拠が少なければ短い文章にする。
- 研究、実験、条件、AI、プロンプト、指示に言及する。

各文について、その文の根拠となる証拠IDを evidenceIds に挙げてください。証拠IDは fragment、answer-1 〜 answer-6 のみです。
JSONのみを返してください。`;

const SCHEMA = {
  type: "object",
  properties: { sentences: { type: "array", items: { type: "object", properties: {
    text: { type: "string" }, evidenceIds: { type: "array", items: { type: "string" } },
  }, required: ["text", "evidenceIds"], additionalProperties: false } } },
  required: ["sentences"], additionalProperties: false,
};

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
    no_recall_converted_to_fact: { type: "boolean" }, no_recall_note: { type: "string" },
  },
  required: ["sentences", "no_recall_converted_to_fact", "no_recall_note"], additionalProperties: false,
};

const sessions = (await readFile(LOG_PATH, "utf8")).split("\n").filter(Boolean)
  .map((l) => JSON.parse(l)).filter((s) => s.sessionId.startsWith(`${BATCH}-`));
const prior = JSON.parse(await readFile(VARIANTS_PATH, "utf8"));

const out = [];
const queue = [...sessions];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const s = queue.shift();
    try {
      const generated = await call({
        model: "gpt-4o-mini", temperature: 0.75, instructions: D_INSTRUCTIONS,
        input: JSON.stringify({
          evidence: { fragment: FRAGMENTS[s.personaId], ...Object.fromEntries(s.turns.map((t) => [`answer-${t.turn}`, t.answer])) },
          contextOnly_questions: Object.fromEntries(s.turns.map((t) => [`question-${t.turn}`, t.question])),
        }, null, 1),
        schemaName: "narrative_sentences", schema: SCHEMA,
      });
      const sentences = generated.sentences.filter((x) => x.text?.trim());
      const judge = await call({
        model: "gpt-5.5", reasoning: { effort: "low" }, instructions: JUDGE_INSTRUCTIONS,
        input: JSON.stringify({
          evidence: { initialFragment: FRAGMENTS[s.personaId], answers: s.turns.map((t) => ({ turn: t.turn, answer: t.answer })) },
          contextOnly_questions: s.turns.map((t) => ({ turn: t.turn, question: t.question })),
          narrativeSentences: sentences.map((x, index) => ({ index, text: x.text })),
        }, null, 1),
        schemaName: "narrative_grounding", schema: JUDGE_SCHEMA,
      });
      out.push({ sessionId: s.sessionId, condition: s.condition, personaId: s.personaId, sentences, judge });
      console.log(`${out.length}/${sessions.length} ${s.sessionId}`);
    } catch (error) {
      console.error(`[FAILED] ${s.sessionId}: ${error}`);
    }
  }
}));

out.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
// merge into the prior variants file shape
const merged = prior.results.map((r) => {
  const d = out.find((x) => x.sessionId === r.sessionId);
  return d ? { ...r, variants: { ...r.variants, D_rewrite: { sentences: d.sentences, judge: d.judge } } } : r;
});
await writeFile(OUT_PATH, `${JSON.stringify({ ...prior, results: merged }, null, 2)}\n`, "utf8");
console.log(`wrote ${OUT_PATH}`);
