// Deterministic (no-API) analysis of a persona batch log.
// Usage: node analyze-static.mjs <batch-id> <jsonl-path> <out-json>
import { readFile, writeFile } from "node:fs/promises";

const [, , BATCH_ID, LOG_PATH, OUT_PATH] = process.argv;
const CONDITIONS = ["standard", "non-odor", "odor-based"];

// --- regexes mirrored from app/api/question-validation.ts (runtime validator) ---
const odorPattern = /(?:匂い|におい|香り|臭い|smell|scent|odor|odour|aroma|fragrance)/iu;
const visualPattern = /(?:見え|見た|見える|光景|景色|目に|色|空(?!気)|広が|明る|暗|形|光|看板|服装|visual|see|saw|look|appearance)/iu;
const auditoryPattern = /(?:音|声|聞こ|auditory|sound|voice|hear|heard)/iu;
const bodilyPattern = /(?:触|感触|手触り|温度|湿度|熱|温か|暖か|冷た|冷え|寒|暑|身体|体(?:に|で|の|が|を|は)|肌|手(?:に|で|の|が|を|は)|足(?:に|で|の|が|を|は)|痛|疲れ|緊張|bodily|body|touch|texture|temperature|sensation)/iu;
const sensoryPattern = new RegExp(`${visualPattern.source}|${auditoryPattern.source}|${bodilyPattern.source}|${odorPattern.source}|雰囲気|空気|味|食感|表情`, "iu");
const noRecallPattern = /(?:思い出せ(?:ません|ない|なかった)|覚えてい(?:ません|ない)|記憶(?:が|は)ありません|匂い(?:が|は)な(?:い|かった)|におい(?:が|は)な(?:い|かった)|no\s+(?:odor|smell)|do(?:\s+not|n't)\s+remember)/iu;
const disclosurePattern = /(?:Standard|Non[- ]?Odor|Odor[- ]?Based|条件|仮説|実験|研究|割り?付け|condition|hypothesis|experiment|study)/iu;
const standardEmotionPattern = /(?:気持ち|考え|感情|気分|どう感じ|thought|feel(?:ing)?|emotion|mood)/iu;
const ODOR_WORDS = /匂い|におい|香り|香ば|臭/u;

function normalize(t) {
  return t.normalize("NFKC").replace(/\s+/gu, "").replace(/[？?。！!、,「」『』]/gu, "").toLowerCase();
}
function hasNoOdorRecallAtTurnOne(history) {
  return history.length > 0 && noRecallPattern.test(history[0].answer);
}
function validateQuestion({ question, condition, turn, fragment, history }) {
  const q = question.trim();
  const flags = [];
  const marks = q.match(/[？?]/gu) ?? [];
  const prev = history.map((t) => normalize(t.question));
  const material = [fragment, ...history.map((t) => t.answer)].join("\n");
  const noOdorRecall = hasNoOdorRecallAtTurnOne(history);
  if (!q) flags.push("empty");
  if (q.length > 80) flags.push("too_long");
  if (marks.length !== 1) flags.push("question_count");
  if (disclosurePattern.test(q)) flags.push("study_disclosure");
  if (/(?:または|それとも|\bor\b|\band\b)/iu.test(q)) flags.push("multiple_requests");
  if (prev.includes(normalize(q))) flags.push("duplicate");
  if (condition === "standard") {
    if (sensoryPattern.test(q)) flags.push("standard_sensory_contamination");
    if (standardEmotionPattern.test(q)) flags.push("standard_emotion_focus");
  }
  if (condition === "non-odor") {
    if (odorPattern.test(q)) flags.push("non_odor_smell");
    const focus = turn <= 2 ? visualPattern : turn <= 4 ? auditoryPattern : bodilyPattern;
    const focusCount = [visualPattern, auditoryPattern, bodilyPattern].filter((p) => p.test(q)).length;
    if (focusCount > 1) flags.push("multiple_modalities");
    if (!focus.test(q)) flags.push("non_odor_turn_focus");
    if (/(?:何色|どんな色|色は|色を|何の形|どんな形|何人|いくつ|大きさ|明るさ)/iu.test(q) && !/(?:色|赤|青|緑|黄|黒|白|形|人数|何人|大きさ|明る)/iu.test(material)) {
      flags.push("unreported_visual_attribute");
    }
  }
  if (condition === "odor-based") {
    if (turn === 1 && /(?:その匂い|そのにおい|感じた匂い|感じたにおい|匂いがした|においがした)/iu.test(q)) flags.push("odor_presence_presupposition");
    if (noOdorRecall && turn > 1) {
      if (odorPattern.test(q) || sensoryPattern.test(q)) flags.push("odor_no_recall_focus");
    } else if (!odorPattern.test(q)) {
      flags.push("odor_focus_missing");
    }
    if (/(?:推測|想像|考えてみ|原因|どこから来|guess|infer|imagine)/iu.test(q)) flags.push("odor_presupposition");
  }
  return flags;
}

// --- extra checks the runtime validator does NOT perform ---
// near-duplicate: normalized Jaccard over character bigrams within a session
function bigrams(t) {
  const s = normalize(t);
  const out = new Set();
  for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
  return out;
}
function jaccard(a, b) {
  const A = bigrams(a), B = bigrams(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}
// no-recall handling: did the participant say "can't recall" and did the NEXT question stay on the same focus?
function noRecallFollowThrough(turns, condition) {
  const events = [];
  for (let i = 0; i < turns.length - 1; i += 1) {
    if (!noRecallPattern.test(turns[i].answer)) continue;
    const next = turns[i + 1].question;
    const sameFocusRepeat =
      condition === "odor-based" ? odorPattern.test(next)
      : condition === "non-odor" ? sensoryPattern.test(next)
      : false;
    events.push({ atTurn: turns[i].turn, answer: turns[i].answer, nextQuestion: next, repeatedSameFocus: sameFocusRepeat });
  }
  return events;
}

const FRAGMENTS = {
  "park-walk": "休日に友人と公園を歩いた。",
  "school-festival": "高校の文化祭でクラスの展示を準備した。",
  "rainy-station": "雨の日に駅で電車を待った。",
  "shopping-street": "家族と商店街で昼食を買った。",
  "library-study": "図書館で試験の勉強をした。",
  "morning-market": "旅行先で朝の市場を見て回った。",
  "riverside-walk": "仕事帰りに川沿いを散歩した。",
  "birthday-cake": "誕生日に自宅でケーキを受け取った。",
  "museum-painting": "美術館で一つの絵を長く見た。",
  "seaside-bicycle": "夕方に自転車で海辺へ行った。",
};
function sessionFragment(s) {
  return FRAGMENTS[s.personaId] ?? "";
}

// full RFC4180-ish CSV parser (handles embedded newlines)
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(r.map((v, i) => [header[i], v])));
}

const raw = await readFile(LOG_PATH, "utf8");
const sessions = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((s) => s.sessionId.startsWith(`${BATCH_ID}-`));
const csvRows = parseCsv(await readFile(new URL(LOG_PATH.replace(/persona-batch-log\.jsonl$/u, "results.csv"), `file://${process.cwd()}/`), "utf8"));
const narrativeById = new Map(csvRows.map((r) => [r.session_id, r.final_result]));
for (const s of sessions) s.narrative = narrativeById.get(s.sessionId) ?? "";

const perCondition = Object.fromEntries(CONDITIONS.map((c) => [c, {
  sessions: 0, turns: 0, modelAttempts: 0, retryTurns: 0, fallbackTurns: 0,
  rejectionFlags: {}, deliveredFlags: {}, deliveredFlagTurns: 0,
  questionChars: [], answerChars: [], narrativeChars: [], narrativeSentences: [],
  odorQuestionTurns: 0, odorAnswerTurns: 0, odorNarratives: 0,
  noRecallAnswerTurns: 0, noRecallRepeats: [], nearDuplicatePairs: [],
  narrativeOdorWithoutAnswerOdor: [], narrativeNoRecallPhrase: [],
  uniqueQuestions: new Set(), turn1Questions: [],
}]));

const sessionRows = [];
for (const s of sessions) {
  const c = perCondition[s.condition];
  c.sessions += 1;
  const history = [];
  const flagsThisSession = [];
  for (const t of s.turns) {
    c.turns += 1;
    c.modelAttempts += t.attempts ?? 1;
    if ((t.attempts ?? 1) > 1) c.retryTurns += 1;
    if (t.source === "fallback") c.fallbackTurns += 1;
    for (const r of t.rejections ?? []) for (const f of r.flags) c.rejectionFlags[f] = (c.rejectionFlags[f] ?? 0) + 1;
    const delivered = validateQuestion({ question: t.question, condition: s.condition, turn: t.turn, fragment: sessionFragment(s), history });
    if (delivered.length) {
      c.deliveredFlagTurns += 1;
      for (const f of delivered) c.deliveredFlags[f] = (c.deliveredFlags[f] ?? 0) + 1;
      flagsThisSession.push({ turn: t.turn, flags: delivered, question: t.question });
    }
    c.questionChars.push(t.question.length);
    c.answerChars.push(t.answer.length);
    c.uniqueQuestions.add(normalize(t.question));
    if (t.turn === 1) c.turn1Questions.push(t.question);
    if (ODOR_WORDS.test(t.question)) c.odorQuestionTurns += 1;
    if (ODOR_WORDS.test(t.answer)) c.odorAnswerTurns += 1;
    if (noRecallPattern.test(t.answer)) c.noRecallAnswerTurns += 1;
    history.push({ question: t.question, answer: t.answer });
  }
  for (const e of noRecallFollowThrough(s.turns, s.condition)) {
    if (e.repeatedSameFocus) c.noRecallRepeats.push({ sessionId: s.sessionId, ...e });
  }
  for (let i = 0; i < s.turns.length; i += 1) {
    for (let j = i + 1; j < s.turns.length; j += 1) {
      const sim = jaccard(s.turns[i].question, s.turns[j].question);
      if (sim >= 0.6) c.nearDuplicatePairs.push({ sessionId: s.sessionId, a: s.turns[i].turn, b: s.turns[j].turn, similarity: Math.round(sim * 100) / 100, qa: s.turns[i].question, qb: s.turns[j].question });
    }
  }
  const narrative = s.narrative ?? "";
  const sentenceCount = (narrative.match(/[。！？]/gu) ?? []).length;
  c.narrativeChars.push(narrative.length);
  c.narrativeSentences.push(sentenceCount);
  if (ODOR_WORDS.test(narrative)) {
    c.odorNarratives += 1;
    if (!s.turns.some((t) => ODOR_WORDS.test(t.answer))) c.narrativeOdorWithoutAnswerOdor.push(s.sessionId);
  }
  if (/思い出せ|分かりません|覚えていません/u.test(narrative)) c.narrativeNoRecallPhrase.push(s.sessionId);
  const evidenceChars = sessionFragment(s).length + s.turns.reduce((n, t) => n + t.answer.length, 0);
  sessionRows.push({
    sessionId: s.sessionId, condition: s.condition, personaId: s.personaId, odorMemory: s.odorMemory,
    fallbackTurns: s.turns.filter((t) => t.source === "fallback").length,
    retryTurns: s.turns.filter((t) => (t.attempts ?? 1) > 1).length,
    deliveredFlags: flagsThisSession,
    narrativeChars: narrative.length, narrativeSentences: sentenceCount,
    evidenceChars, expansionRatio: Math.round((narrative.length / Math.max(evidenceChars, 1)) * 100) / 100,
    narrativeAttempts: s.narrativeAttempts,
  });
}

const mean = (xs) => xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0;
const max = (xs) => xs.length ? Math.max(...xs) : 0;

const summary = Object.fromEntries(CONDITIONS.map((cond) => {
  const c = perCondition[cond];
  return [cond, {
    sessions: c.sessions, turns: c.turns,
    modelAttemptsPerTurn: Math.round((c.modelAttempts / Math.max(c.turns, 1)) * 100) / 100,
    retryTurns: c.retryTurns, retryRate: Math.round((c.retryTurns / Math.max(c.turns, 1)) * 1000) / 10,
    fallbackTurns: c.fallbackTurns, fallbackRate: Math.round((c.fallbackTurns / Math.max(c.turns, 1)) * 1000) / 10,
    rejectionFlags: c.rejectionFlags,
    deliveredViolationTurns: c.deliveredFlagTurns, deliveredViolationFlags: c.deliveredFlags,
    uniqueQuestions: c.uniqueQuestions.size,
    avgQuestionChars: mean(c.questionChars), maxQuestionChars: max(c.questionChars),
    avgAnswerChars: mean(c.answerChars),
    avgNarrativeChars: mean(c.narrativeChars), avgNarrativeSentences: mean(c.narrativeSentences),
    odorQuestionTurns: c.odorQuestionTurns, odorAnswerTurns: c.odorAnswerTurns, odorNarratives: c.odorNarratives,
    noRecallAnswerTurns: c.noRecallAnswerTurns,
    noRecallSameFocusRepeats: c.noRecallRepeats,
    nearDuplicatePairs: c.nearDuplicatePairs,
    narrativeOdorWithoutAnswerOdor: c.narrativeOdorWithoutAnswerOdor,
    narrativeContainsNoRecallPhrase: c.narrativeNoRecallPhrase,
    turn1Questions: c.turn1Questions,
  }];
}));

await writeFile(OUT_PATH, `${JSON.stringify({ batchId: BATCH_ID, sessionCount: sessions.length, summary, sessionRows }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ batchId: BATCH_ID, sessionCount: sessions.length, summary }, null, 2));
