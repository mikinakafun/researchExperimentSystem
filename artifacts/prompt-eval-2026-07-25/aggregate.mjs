// Merge static + judge results into report tables.
// Usage: node aggregate.mjs <static.json> <judge.json> <out.json>
import { readFile, writeFile } from "node:fs/promises";

const [, , STATIC_PATH, JUDGE_PATH, OUT_PATH] = process.argv;
const CONDITIONS = ["standard", "non-odor", "odor-based"];
const statics = JSON.parse(await readFile(STATIC_PATH, "utf8"));
const judged = JSON.parse(await readFile(JUDGE_PATH, "utf8"));

const byCondition = Object.fromEntries(CONDITIONS.map((c) => [c, judged.results.filter((r) => r.condition === c && !r.error)]));

function tally(items, key) {
  const out = {};
  for (const i of items) out[i[key]] = (out[i[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

// focus / function distribution per condition and per turn
const focusByCondition = {}, functionByCondition = {}, functionByTurn = {}, focusByTurn = {};
for (const cond of CONDITIONS) {
  const qs = byCondition[cond].flatMap((r) => r.questions);
  focusByCondition[cond] = tally(qs, "focus");
  functionByCondition[cond] = tally(qs, "function");
  functionByTurn[cond] = {};
  focusByTurn[cond] = {};
  for (let turn = 1; turn <= 6; turn += 1) {
    const t = qs.filter((q) => q.turn === turn);
    functionByTurn[cond][turn] = tally(t, "function");
    focusByTurn[cond][turn] = tally(t, "focus");
  }
}

// modal (most common) function per condition×turn → symmetry check
const modalFunction = {};
for (const cond of CONDITIONS) {
  modalFunction[cond] = {};
  for (let turn = 1; turn <= 6; turn += 1) {
    const entries = Object.entries(functionByTurn[cond][turn]);
    modalFunction[cond][turn] = entries.length ? `${entries[0][0]} (${entries[0][1]}/${entries.reduce((n, e) => n + e[1], 0)})` : "-";
  }
}
const symmetryMismatches = [];
for (let turn = 1; turn <= 6; turn += 1) {
  const modes = CONDITIONS.map((c) => (Object.entries(functionByTurn[c][turn])[0] ?? ["-"])[0]);
  if (new Set(modes).size > 1) symmetryMismatches.push({ turn, modes: Object.fromEntries(CONDITIONS.map((c, i) => [c, modes[i]])) });
}

// presupposition
const presupposition = Object.fromEntries(CONDITIONS.map((cond) => {
  const qs = byCondition[cond].flatMap((r) => r.questions.map((q) => ({ ...q, sessionId: r.sessionId })));
  const hits = qs.filter((q) => q.presupposes_unreported);
  return [cond, {
    turns: qs.length, flagged: hits.length,
    rate: Math.round((hits.length / Math.max(qs.length, 1)) * 1000) / 10,
    examples: hits.slice(0, 6).map((h) => ({ sessionId: h.sessionId, turn: h.turn, question: h.question, presupposed: h.presupposed_content })),
  }];
}));

// narrative grounding
const grounding = Object.fromEntries(CONDITIONS.map((cond) => {
  const rs = byCondition[cond];
  const sents = rs.flatMap((r) => r.narrative.sentences.map((s) => ({ ...s, sessionId: r.sessionId })));
  const unsupported = sents.filter((s) => s.verdict === "unsupported");
  const connective = sents.filter((s) => s.verdict === "connective");
  const noRecallSessions = rs.filter((r) => r.narrative.no_recall_converted_to_fact);
  const perSession = rs.map((r) => ({
    sessionId: r.sessionId,
    sentences: r.narrative.sentences.length,
    unsupported: r.narrative.sentences.filter((s) => s.verdict === "unsupported").length,
  }));
  return [cond, {
    sessions: rs.length, sentences: sents.length,
    supported: sents.filter((s) => s.verdict === "supported").length,
    connective: connective.length,
    unsupported: unsupported.length,
    unsupportedRate: Math.round((unsupported.length / Math.max(sents.length, 1)) * 1000) / 10,
    sessionsWithAnyUnsupported: perSession.filter((p) => p.unsupported > 0).length,
    avgUnsupportedPerSession: Math.round((unsupported.length / Math.max(rs.length, 1)) * 10) / 10,
    noRecallConvertedSessions: noRecallSessions.map((r) => ({ sessionId: r.sessionId, note: r.narrative.no_recall_note })),
    examples: unsupported.slice(0, 8).map((s) => ({ sessionId: s.sessionId, text: s.text, added: s.added_content })),
    perSession,
  }];
}));

const report = {
  batchId: judged.batchId,
  judgeModel: judged.results.find((r) => r.judgeModel)?.judgeModel ?? judged.judgeModel,
  generation: statics.summary,
  sessionRows: statics.sessionRows,
  focusByCondition, functionByCondition, focusByTurn, functionByTurn, modalFunction, symmetryMismatches,
  presupposition, grounding,
  judgeErrors: judged.results.filter((r) => r.error),
};
await writeFile(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

// console tables
console.log("=== modal turn function per condition (symmetry) ===");
console.log(["turn", ...CONDITIONS].join("\t"));
for (let turn = 1; turn <= 6; turn += 1) console.log([turn, ...CONDITIONS.map((c) => modalFunction[c][turn])].join("\t"));
console.log("\n=== focus distribution per condition ===");
for (const c of CONDITIONS) console.log(c, JSON.stringify(focusByCondition[c]));
console.log("\n=== presupposition ===");
for (const c of CONDITIONS) console.log(c, presupposition[c].flagged, `${presupposition[c].rate}%`);
console.log("\n=== narrative grounding ===");
for (const c of CONDITIONS) {
  const g = grounding[c];
  console.log(c, `sent=${g.sentences} supported=${g.supported} connective=${g.connective} unsupported=${g.unsupported} (${g.unsupportedRate}%) sessionsAffected=${g.sessionsWithAnyUnsupported}/${g.sessions} noRecallConverted=${g.noRecallConvertedSessions.length}`);
}
console.log(`\nwrote ${OUT_PATH}`);
