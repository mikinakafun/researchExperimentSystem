import { readFile, writeFile, mkdir } from "node:fs/promises";
const dir = new URL("./", import.meta.url).pathname;
const raw = JSON.parse(await readFile(`${dir}raw.json`, "utf8"));
const prior = raw.records.find((r) => r.kind === "follow-up" && r.scenario === "continuous-nonrecall" && r.condition === "standard" && r.turn === 1 && r.status === 200 && r.response?.question);
if (!prior) throw new Error("valid Standard t1 not found");
const fragment = "先週、用事で外出した。";
const recovery = [];
const history = [{ question: prior.response.question, answer: "思い出せません。" }];
async function post(path, request) {
  const requestedAt = new Date().toISOString(); const started = Date.now();
  const response = await fetch(`http://localhost:3000${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
  const text = await response.text(); let payload; try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  return { requestedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, status: response.status, ok: response.ok, request: structuredClone(request), response: payload };
}
for (let turn = 2; turn <= 6; turn++) {
  const request = structuredClone({ condition: "standard", fragment, history, turn, language: "ja" });
  const rec = await post("/api/follow-up", request);
  recovery.push({ kind: "follow-up", scenario: "continuous-nonrecall", condition: "standard", turn, selectedAnswer: "思い出せません。", ...rec });
  await mkdir(dir, { recursive: true }); await writeFile(`${dir}recovery.json`, JSON.stringify({ generatedAt: new Date().toISOString(), recovery, narrative: null }, null, 2));
  if (!rec.ok || !rec.response?.question) throw new Error(`follow-up t${turn} failed: ${rec.status}`);
  history.push({ question: rec.response.question, answer: "思い出せません。" });
}
const narrativeRequest = { fragment, answers: history, language: "ja" };
const narrative = await post("/api/narrative", narrativeRequest);
recovery.push({ kind: "narrative", scenario: "continuous-nonrecall", condition: "standard", turn: null, selectedAnswer: null, ...narrative });
await writeFile(`${dir}recovery.json`, JSON.stringify({ generatedAt: new Date().toISOString(), recovery }, null, 2));
console.log(JSON.stringify({ followUps: 5, narratives: 1, output: `${dir}recovery.json` }, null, 2));
