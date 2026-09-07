// Live probe script for ResearchPilotSystem follow-up / narrative endpoints.
// Run with: node live-probe.mjs
// Writes full raw request+response records to live-runs.json in this directory.

const BASE = "http://127.0.0.1:3000";
const OUT_PATH = new URL("./live-runs.json", import.meta.url);

const runs = {
  meta: { startedAt: new Date().toISOString() },
  conversations: {}, // keyed by scenario label -> array of turn records
  narratives: {},    // keyed by scenario label -> record
  edgeProbes: [],    // array of probe records
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callEndpoint(path, body, { retries = 2, retryDelayMs = 1000 } = {}) {
  const attempts = [];
  let lastError = null;
  for (let i = 0; i <= retries; i += 1) {
    const attemptRecord = { attemptNumber: i + 1, requestBody: body };
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { __unparsedText: text };
      }
      attemptRecord.status = res.status;
      attemptRecord.responseBody = json;
      attempts.push(attemptRecord);
      // Only retry on transient-looking failures (5xx). 4xx are final/expected.
      if (res.status >= 500 && i < retries) {
        console.warn(`[retry] ${path} status=${res.status} attempt=${i + 1}, retrying...`);
        lastError = new Error(`status ${res.status}`);
        await sleep(retryDelayMs);
        continue;
      }
      return { finalStatus: res.status, finalBody: json, attempts };
    } catch (err) {
      attemptRecord.error = String(err && err.stack ? err.stack : err);
      attempts.push(attemptRecord);
      lastError = err;
      if (i < retries) {
        console.warn(`[retry] ${path} threw error, attempt=${i + 1}, retrying...`, err);
        await sleep(retryDelayMs);
        continue;
      }
    }
  }
  return { finalStatus: null, finalBody: null, attempts, error: String(lastError) };
}

async function runFollowUpConversation({ label, condition, fragment, language, answers }) {
  console.log(`\n=== Starting conversation: ${label} ===`);
  const turnRecords = [];
  const history = [];
  for (let turn = 1; turn <= 6; turn += 1) {
    const body = {
      condition,
      fragment,
      history: history.slice(), // history.length === turn-1
      turn,
      language,
    };
    console.log(`[${label}] turn ${turn} -> calling /api/follow-up`);
    const result = await callEndpoint("/api/follow-up", body);
    turnRecords.push({ turn, request: body, result });

    const respBody = result.finalBody;
    let questionForHistory = `[NO_QUESTION_RETURNED_TURN_${turn}]`;
    if (respBody && typeof respBody.question === "string" && respBody.question.trim()) {
      questionForHistory = respBody.question;
    } else {
      console.warn(`[${label}] turn ${turn}: no usable question in response, status=${result.finalStatus}`);
    }

    const answerForThisTurn = answers[turn - 1];
    history.push({ question: questionForHistory, answer: answerForThisTurn });

    // Delay between OpenAI-backed calls.
    await sleep(700);
  }
  runs.conversations[label] = turnRecords;
  return { label, history, turnRecords };
}

async function runNarrative({ label, fragment, language, qaPairs }) {
  console.log(`\n=== Narrative for: ${label} ===`);
  const body = {
    fragment,
    answers: qaPairs.map((qa) => ({ question: qa.question, answer: qa.answer })),
    language,
  };
  const result = await callEndpoint("/api/narrative", body);
  runs.narratives[label] = { request: body, result };
  await sleep(700);
  return result;
}

async function runEdgeProbe(label, path, body) {
  console.log(`\n=== Edge probe: ${label} ===`);
  const result = await callEndpoint(path, body, { retries: 0 });
  runs.edgeProbes.push({ label, path, request: body, result });
  await sleep(200);
}

async function main() {
  const fragmentJa = "休日に友人と公園を歩いた。";
  const fragmentEn = "I walked through a park with a friend on a day off.";

  // ---- A) Three JA 6-turn conversations, one per condition ----

  const standardAnswersJa = [
    "友人と近所の公園まで歩いて行きました。天気が良かったので二人とも軽装でした。",
    "公園に着いてからはベンチに座って少し話をしました。特に予定は決めていませんでした。",
    "着いたのはお昼を少し過ぎたころだったと思います。1時間くらい滞在しました。",
    "友人と近況について話しながら、公園の中を一緒に歩き回りました。",
    "帰り道にコンビニに寄って飲み物を買いました。特に変わったことはありませんでした。",
    "そのあとはそれぞれ家に帰りました。細かい時間まではっきり思い出せない部分もあります。",
  ];

  const visualAnswersJa = [
    "友人と近所の公園まで歩いて行きました。木々の緑がとても鮮やかに見えました。",
    "公園の花壇にはオレンジ色や黄色の花がたくさん咲いていて、明るい色合いが印象的でした。",
    "着いたのはお昼過ぎで、日差しが強くて地面に木漏れ日の模様ができていました。",
    "匂いは思い出せません。", // will be overridden below to be the *visual* non-recall wording per instructions (see note)
    "池のそばを歩いたとき、水面が太陽の光を反射してきらきら光っていたのを覚えています。",
    "帰り際に見た夕方の空は、オレンジとピンクのグラデーションでとてもきれいでした。",
  ];
  // Per task instructions: in the VISUAL conversation, turn 4 answer must be a non-recall.
  // Use a visually-scoped non-recall phrase (still matches the noRecallPattern via "思い出せません").
  visualAnswersJa[3] = "そのときの具体的な光景については、正直あまりよく思い出せません。";

  const odorAnswersJa = [
    "友人と近所の公園まで歩いて行きました。あたりには青草のような匂いが漂っていました。",
    "匂いは思い出せません。", // explicit non-recall required at turn 2 for odor conversation
    "公園の花壇の近くを通ったときは甘い花の香りがした気がします。",
    "芝生のそばでは少し土の匂いも感じました。",
    "帰り道に通ったパン屋さんから焼きたてパンの香ばしい匂いがしてきました。",
    "最後に公園を出るときには、また風に乗って草の匂いを感じました。",
  ];

  const standardConvo = await runFollowUpConversation({
    label: "ja_standard",
    condition: "standard",
    fragment: fragmentJa,
    language: "ja",
    answers: standardAnswersJa,
  });

  const visualConvo = await runFollowUpConversation({
    label: "ja_visual",
    condition: "visual",
    fragment: fragmentJa,
    language: "ja",
    answers: visualAnswersJa,
  });

  const odorConvo = await runFollowUpConversation({
    label: "ja_odor",
    condition: "odor",
    fragment: fragmentJa,
    language: "ja",
    answers: odorAnswersJa,
  });

  // ---- B) One EN 6-turn conversation, condition visual ----

  const visualAnswersEn = [
    "We walked to the park near my friend's place. The trees looked really vivid green in the sunlight.",
    "There was a flower bed with bright orange and yellow flowers that really stood out to me.",
    "We arrived a bit after noon, and the sunlight created dappled patterns of light and shadow on the ground.",
    "We walked together past the pond, chatting about random things along the way.",
    "The water in the pond was sparkling because the sunlight was reflecting off small ripples.",
    "As we left in the early evening, the sky had an orange and pink gradient that looked really pretty.",
  ];

  const visualConvoEn = await runFollowUpConversation({
    label: "en_visual",
    condition: "visual",
    fragment: fragmentEn,
    language: "en",
    answers: visualAnswersEn,
  });

  // ---- C) Narrative from ja_standard and en_visual conversations ----

  await runNarrative({
    label: "ja_standard_narrative",
    fragment: fragmentJa,
    language: "ja",
    qaPairs: standardConvo.history,
  });

  await runNarrative({
    label: "en_visual_narrative",
    fragment: fragmentEn,
    language: "en",
    qaPairs: visualConvoEn.history,
  });

  // ---- D) Error / edge probes ----

  // D1: history.length !== turn-1 (turn=3 but history has only 1 item)
  await runEdgeProbe("history_length_mismatch", "/api/follow-up", {
    condition: "standard",
    fragment: fragmentJa,
    history: [{ question: "質問1", answer: "回答1" }],
    turn: 3,
    language: "ja",
  });

  // D2: invalid condition
  await runEdgeProbe("invalid_condition", "/api/follow-up", {
    condition: "invalid",
    fragment: fragmentJa,
    history: [],
    turn: 1,
    language: "ja",
  });

  // D3: turn 7 (out of range)
  await runEdgeProbe("turn_out_of_range_7", "/api/follow-up", {
    condition: "standard",
    fragment: fragmentJa,
    history: [
      { question: "q1", answer: "a1" },
      { question: "q2", answer: "a2" },
      { question: "q3", answer: "a3" },
      { question: "q4", answer: "a4" },
      { question: "q5", answer: "a5" },
      { question: "q6", answer: "a6" },
    ],
    turn: 7,
    language: "ja",
  });

  // D4: invalid language "fr"
  await runEdgeProbe("invalid_language_fr", "/api/follow-up", {
    condition: "standard",
    fragment: fragmentJa,
    history: [],
    turn: 1,
    language: "fr",
  });

  // D5: narrative with only 5 answers
  await runEdgeProbe("narrative_only_5_answers", "/api/narrative", {
    fragment: fragmentJa,
    answers: [
      { question: "q1", answer: "a1" },
      { question: "q2", answer: "a2" },
      { question: "q3", answer: "a3" },
      { question: "q4", answer: "a4" },
      { question: "q5", answer: "a5" },
    ],
    language: "ja",
  });

  runs.meta.finishedAt = new Date().toISOString();

  const fs = await import("node:fs/promises");
  await fs.writeFile(OUT_PATH, JSON.stringify(runs, null, 2), "utf-8");
  console.log(`\nWrote full raw runs to ${OUT_PATH.pathname}`);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exitCode = 1;
});
