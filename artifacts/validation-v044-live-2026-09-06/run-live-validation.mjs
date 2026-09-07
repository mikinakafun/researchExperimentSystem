import { mkdir, writeFile, readFile } from "node:fs/promises";

const BASE = process.env.MOCK_BASE_URL || "http://localhost:3000";
const OUT = new URL("./", import.meta.url).pathname;
const conditions = ["standard", "visual", "odor"];
const scenarios = [
  {
    id: "specific-recall",
    fragment: "先月の日曜日、友人と公園を歩いた。",
    mode: "specific",
    materials: {
      event: "日曜の午後、友人と公園を歩き、途中で売店のお茶を買って池の近くのベンチで休みました。",
      visual: "濃い緑の芝生、日光が反射する池、赤いパラソルが見えました。",
      odor: "刈ったばかりの芝生の青い匂いと、売店近くの焼きとうもろこしの香ばしい匂いがしました。",
    },
  },
  {
    id: "partial-recall",
    fragment: "先週、駅前の店で家族と昼食を買った。",
    mode: "partial",
    materials: { event: "家族と駅前の店で昼食を買ったことと、店の前に人が並んでいたことだけ覚えています。" },
  },
  {
    id: "continuous-nonrecall",
    fragment: "先週、用事で外出した。",
    mode: "none",
    materials: {},
  },
];

function answerFor(scenario, condition, question) {
  if (scenario.mode === "none") return "思い出せません。";
  const q = String(question);
  if (scenario.mode === "partial") {
    if (/匂い|におい|香り|smell|odor/i.test(q)) return "匂いについては思い出せません。";
    if (/見え|目に|visual|see|saw/i.test(q)) return "店の前に人が並んでいたことは少し覚えていますが、ほかの視覚情報は思い出せません。";
    if (/何を|何をして|買|行動|したこと|what did|doing|action/i.test(q)) return "家族と駅前の店で昼食を買ったことは覚えていますが、具体的な品物や順番は思い出せません。";
    return "その出来事については、家族と駅前の店で昼食を買ったことだけ覚えています。ほかの詳細は思い出せません。";
  }
  if (/匂い|におい|香り|smell|odor/i.test(q)) return scenario.materials.odor;
  if (/見え|目に|視覚|visual|see|saw|look/i.test(q)) return scenario.materials.visual;
  if (/いつ|時点|順番|前後|when|time|order/i.test(q)) return scenario.materials.event;
  if (/誰|一緒|何を|何|した|行動|where|who|what|doing|action/i.test(q)) return scenario.materials.event;
  if (condition === "visual") return scenario.materials.visual;
  if (condition === "odor") return scenario.materials.odor;
  return scenario.materials.event;
}

async function post(path, body) {
  const requestedAt = new Date().toISOString();
  const started = Date.now();
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let payload;
  try { payload = JSON.parse(raw); } catch { payload = { raw }; }
  return { requestedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, status: response.status, ok: response.ok, request: body, response: payload };
}

let records = [];
let failures = [];
if (process.argv.includes("--resume")) {
  try { const prior = JSON.parse(await readFile(`${OUT}raw.json`, "utf8")); records = prior.records ?? []; failures = prior.failures ?? []; } catch { /* start empty if no prior artifact */ }
}
for (const scenario of scenarios) {
  for (const condition of conditions) {
    const priorTurns = records.filter((r) => r.kind === "follow-up" && r.scenario === scenario.id && r.condition === condition && r.response?.question && r.selectedAnswer).sort((a, b) => a.turn - b.turn);
    const history = priorTurns.map((r) => ({ question: r.response.question, answer: r.selectedAnswer }));
    if (history.length >= 6) continue;
    for (let turn = history.length + 1; turn <= 6; turn += 1) {
      const req = structuredClone({ condition, fragment: scenario.fragment, history, turn, language: "ja" });
      try {
        const rec = await post("/api/follow-up", req);
        const selectedAnswer = rec.ok && rec.response?.question ? answerFor(scenario, condition, rec.response.question) : null;
        records.push({ kind: "follow-up", scenario: scenario.id, condition, turn, selectedAnswer, ...rec });
        await mkdir(OUT, { recursive: true });
        await writeFile(`${OUT}raw.json`, JSON.stringify({ generatedAt: new Date().toISOString(), scenarios: scenarios.map(({ id, fragment, mode, materials }) => ({ id, fragment, mode, materials })), records, failures }, null, 2));
        if (!rec.ok || !rec.response?.question) { failures.push({ kind: "follow-up", scenario: scenario.id, condition, turn, status: rec.status, response: rec.response }); break; }
        const answer = selectedAnswer;
        history.push({ question: rec.response.question, answer });
      } catch (error) {
        failures.push({ kind: "follow-up", scenario: scenario.id, condition, turn, error: String(error) });
        break;
      }
    }
    if (history.length === 6) {
      try {
        const rec = await post("/api/narrative", { fragment: scenario.fragment, answers: history, language: "ja" });
        records.push({ kind: "narrative", scenario: scenario.id, condition, turn: null, ...rec });
        if (!rec.ok || !rec.response?.narrative) failures.push({ kind: "narrative", scenario: scenario.id, condition, status: rec.status, response: rec.response });
      } catch (error) { failures.push({ kind: "narrative", scenario: scenario.id, condition, error: String(error) }); }
    }
  }
}
await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}raw.json`, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, scenarios: scenarios.map(({ id, fragment, mode }) => ({ id, fragment, mode })), records, failures }, null, 2));
console.log(JSON.stringify({ records: records.length, followUps: records.filter((r) => r.kind === "follow-up").length, narratives: records.filter((r) => r.kind === "narrative").length, failures: failures.length, output: `${OUT}raw.json` }, null, 2));
if (failures.length) process.exitCode = 1;
