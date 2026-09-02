"use client";

import { useState } from "react";

type Step = "welcome" | "consent" | "recall" | "questions" | "narrative" | "evaluation" | "check" | "debrief" | "done";
type Condition = "standard" | "visual" | "odor";
type QuestionMetadata = {
  conditionFocus: Condition | "neutral";
  turnFunction: "broad_recall" | "grounded_detail" | "temporal_anchor" | "action_relation" | "second_grounded_detail" | "unresolved_attribute";
  targetEvidenceId: string | null;
  nonRecallTransition: boolean;
  insufficientEvidenceTransition: boolean;
};
type NarrativeSentence = { text: string; evidenceIds: string[] };

const workflowSteps: Exclude<Step, "done">[] = ["welcome", "consent", "recall", "questions", "narrative", "evaluation", "check", "debrief"];

const axes = [
  ["記憶様感", ["この文章は、実際にあった個人的出来事を思い返したもののように感じられる。", "この文章は、自分の実体験の語りとして自然に感じられる。", "この文章には、過去の出来事を思い返しているような「思い出らしさ」がある。"]],
  ["情景構成感", ["この文章を読むと、出来事の場面全体を一つのまとまりとして思い描ける。", "場所の広がりや、人物・物の配置がはっきり思い浮かぶ。", "自分がその場にいるように、場面を内側から見渡せる感じがする。"]],
  ["叙述鮮明性", ["この文章は、全体として鮮明で具体的に感じられる。", "この文章には、場面や出来事を生き生きと感じさせる細部が含まれている。", "出来事の様子が、ぼんやりではなく、はっきり伝わってくる。"]],
  ["感情再体験感", ["この文章を読むと、その出来事のときに感じた感情がよみがえる。", "この文章を読んでいる間、当時の感情をもう一度体験しているように感じる。", "この文章は、当時の感情を自分の中に呼び戻す。"]],
] as const;

const evaluationItems = axes.flatMap(([axis, items]) => items.map((text, index) => ({
  id: `eval-${axis}-${index}`,
  text,
})));

const checks = [
  { id: "MC-EVENT", text: "提示された質問は、出来事の中での行動、人物、やり取り、起きた順序に、どの程度あなたの注意を向けましたか。", low: "全く向けなかった", high: "非常に強く向けた" },
  { id: "MC-VISUAL", text: "提示された質問は、物や人の見た目、色、明るさ、配置などの視覚的な詳細に、どの程度あなたの注意を向けましたか。", low: "全く向けなかった", high: "非常に強く向けた" },
  { id: "MC-ODOR", text: "提示された質問は、匂いや空気のにおいに、どの程度あなたの注意を向けましたか。", low: "全く向けなかった", high: "非常に強く向けた" },
  { id: "DQ-PRESSURE", text: "実際には思い出せない詳細まで答えるよう求められていると、どの程度感じましたか。", low: "全く感じなかった", high: "非常に強く感じた" },
  { id: "DQ-MEMORYBASIS", text: "あなたの回答は、推測ではなく、実際に思い出せた内容にどの程度基づいていましたか。", low: "全く基づいていなかった", high: "完全に基づいていた" },
  { id: "DQ-UNSAID", text: "作成された文章には、あなたが答えていない内容が、どの程度含まれていたと感じましたか。", low: "全く含まれていなかった", high: "非常に多く含まれていた" },
];

async function callApi(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    if (payload?.error === "OPENAI_API_KEY is not configured on the server.") {
      throw new Error("実APIの設定がありません。サーバーの環境変数を確認してください。");
    }
    if (path === "/api/save-result") {
      throw new Error("CSVへの保存に失敗しました。サーバーのdataディレクトリを確認してください。");
    }
    throw new Error("生成に失敗しました。入力内容を確認して、もう一度お試しください。");
  }
  return payload as {
    question?: string;
    metadata?: QuestionMetadata;
    narrative?: string;
    sentences?: NarrativeSentence[];
    saved?: boolean;
  };
}

function randomCondition(): Condition {
  return ["standard", "visual", "odor"][Math.floor(Math.random() * 3)] as Condition;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Page() {
  const [step, setStep] = useState<Step>("welcome");
  const [consent, setConsent] = useState(false);
  const [fragment, setFragment] = useState("");
  const [recallAttempts, setRecallAttempts] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(6).fill(""));
  const [questionTexts, setQuestionTexts] = useState<string[]>(Array(6).fill(""));
  const [questionMetadata, setQuestionMetadata] = useState<Array<QuestionMetadata | null>>(Array(6).fill(null));
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [narrative, setNarrative] = useState("");
  const [narrativeSentences, setNarrativeSentences] = useState<NarrativeSentence[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [saved, setSaved] = useState(false);
  const questionProgress = step === "questions" ? (currentQuestion + 1) / 6 : 0;
  const workflowStep = step === "done" ? 0 : workflowSteps.indexOf(step) + 1;
  const workflowProgress = workflowStep / workflowSteps.length;
  const setRating = (id: string, value: number) => setRatings((current) => ({ ...current, [id]: value }));
  const allRatingsAnswered = evaluationItems.every(({ id }) => ratings[id] !== undefined);
  const allChecksAnswered = checks.every(({ id }) => ratings[id] !== undefined);

  async function startQuestions() {
    const assignedCondition = randomCondition();
    const newSessionId = createSessionId();
    setSessionId(newSessionId);
    setSaved(false);
    setCondition(assignedCondition);
    setBusy(true);
    setError(null);
    setAnswers(Array(6).fill(""));
    setQuestionTexts(Array(6).fill(""));
    setQuestionMetadata(Array(6).fill(null));
    setCurrentQuestion(0);
    setStep("questions");
    try {
      const payload = await callApi("/api/follow-up", {
        condition: assignedCondition,
        fragment,
        history: [],
        turn: 1,
      });
      if (!payload.question || !payload.metadata) throw new Error("実APIから検証済み質問を受け取れませんでした。");
      setQuestionTexts((current) => current.map((value, index) => index === 0 ? payload.question! : value));
      setQuestionMetadata((current) => current.map((value, index) => index === 0 ? payload.metadata! : value));
    } catch (caught) {
      setAnswers(Array(6).fill(""));
      setQuestionTexts(Array(6).fill(""));
      setQuestionMetadata(Array(6).fill(null));
      setCurrentQuestion(0);
      setCondition(null);
      setStep("recall");
      setError(caught instanceof Error ? caught.message : "生成に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function submitRecall(event: React.FormEvent) {
    event.preventDefault();
    if (fragment.trim()) await startQuestions();
  }

  function noRecall() {
    if (recallAttempts === 0) {
      setRecallAttempts(1);
      return;
    }
    setStep("done");
  }

  async function saveResult() {
    if (saved || busy || !sessionId || !condition || !fragment.trim() || questionTexts.length !== 6 || answers.length !== 6 || !narrative.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await callApi("/api/save-result", {
        sessionId,
        recordType: "participant",
        condition,
        fragment,
        questions: questionTexts,
        questionMetadata,
        answers,
        finalResult: narrative,
        narrativeSentences,
        evaluation: Object.fromEntries(evaluationItems.map(({ id }) => [id, ratings[id]])),
        checks: Object.fromEntries(checks.map(({ id }) => [id, ratings[id]])),
      });
      setSaved(true);
      setStep("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CSVへの保存に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(event: React.FormEvent) {
    event.preventDefault();
    const answer = answers[currentQuestion];
    if (!answer?.trim() || !questionTexts[currentQuestion] || !condition || busy) return;
    const completedAnswers = answers.map((value, index) => index === currentQuestion ? answer : value);
    setError(null);
    if (currentQuestion === 5) {
      setBusy(true);
      setAnswers(completedAnswers);
      try {
        const payload = await callApi("/api/narrative", {
          fragment,
          answers: completedAnswers.map((value, index) => ({ question: questionTexts[index], answer: value })),
        });
        if (!payload.narrative) throw new Error("実APIから文章を受け取れませんでした。");
        setNarrative(payload.narrative);
        setNarrativeSentences(payload.sentences ?? []);
        setStep("narrative");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "生成に失敗しました。もう一度お試しください。");
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    setAnswers(completedAnswers);
    try {
      const payload = await callApi("/api/follow-up", {
        condition,
        fragment,
        history: completedAnswers.slice(0, currentQuestion + 1).map((value, index) => ({
          question: questionTexts[index],
          answer: value,
          metadata: questionMetadata[index] ?? undefined,
        })),
        turn: currentQuestion + 2,
      });
      if (!payload.question || !payload.metadata) throw new Error("実APIから検証済み質問を受け取れませんでした。");
      setQuestionTexts((current) => current.map((value, index) => index === currentQuestion + 1 ? payload.question! : value));
      setQuestionMetadata((current) => current.map((value, index) => index === currentQuestion + 1 ? payload.metadata! : value));
      setCurrentQuestion(currentQuestion + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("welcome");
    setConsent(false);
    setFragment("");
    setRecallAttempts(0);
    setAnswers(Array(6).fill(""));
    setQuestionTexts(Array(6).fill(""));
    setQuestionMetadata(Array(6).fill(null));
    setCurrentQuestion(0);
    setCondition(null);
    setSessionId("");
    setSaved(false);
    setNarrative("");
    setNarrativeSentences([]);
    setRatings({});
    setError(null);
  }

  return <main className="shell">
    <header className="header"><div><p className="eyebrow">記憶に関する研究（検証用mock）</p><p className="draft">MOCK / DRAFT — 研究実施未承認</p></div><span className="version">PROTOCOL v0.3.0 / PROMPT v0.4.1</span></header>
    <div className="notice">これはローカル検証用です。質問生成と文章生成で実OpenAI APIを呼び出し、入力内容を外部へ送信します。完了時に結果をローカルCSVへ保存します。</div>
    <section className="panel" aria-busy={busy}>
      {error && <div className="error-alert" role="alert">{error}</div>}
      {busy && <div className="status-line" role="status">{step === "debrief" ? "CSVへ保存中…" : "OpenAI APIへ送信中…"}</div>}
      {step !== "done" && <div className="workflow-status">
        <div className="workflow-copy"><span>進行</span><span>STEP {workflowStep} / {workflowSteps.length}</span></div>
        <div className="workflow-track" role="progressbar" aria-label="全体の進行" aria-valuemin={1} aria-valuemax={workflowSteps.length} aria-valuenow={workflowStep} aria-valuetext={`ステップ ${workflowStep} / ${workflowSteps.length}`}><span style={{ transform: `scaleX(${workflowProgress})` }} /></div>
      </div>}
      {step === "welcome" && <><h1><span className="title-line"><span className="title-phrase">過去の出来事</span><wbr /><span className="title-phrase">について</span></span><span className="title-line"><span className="title-phrase">短い文章を</span><wbr /><span className="title-phrase">作ります</span></span></h1><p className="lead">あなたの断片的な記憶と、質問への回答を材料に、実APIで質問と文章を生成し、その文章について評価します。</p><div className="callout"><strong>質問条件は参加者画面に<wbr /><span className="title-phrase">表示しません</span></strong><br />有効な初期断片を入力した後、質問条件へ割り付けます。</div><button className="primary" onClick={() => setStep("consent")}>説明を読む</button></>}
      {step === "consent" && <><h1>参加前の説明</h1><div className="copy"><p>この検証は、自伝的記憶に関する質問戦略の参加者フローを確認するためのものです。</p><p>入力した記憶内容と質問への回答は、質問生成と文章生成のためにOpenAI APIへ送信されます。完了時には、初期断片、質問、回答、生成文章、評価結果をこのPCのローカルCSVへ保存します。</p><p>API側のデータ取扱いと、このPCのCSVファイルの管理方法を確認してください。安全に説明できる出来事を選び、答えたくない場合はいつでも中止できます。</p></div><label className="check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> 説明を読み、実APIへの送信とローカルCSVへの保存を理解して検証を開始します。</label><div className="actions"><button className="secondary" onClick={() => setStep("done")}>参加しない</button><button className="primary" disabled={!consent} onClick={() => setStep("recall")}>同意して進む</button></div></>}
      {step === "recall" && <><h1>一つの出来事を思い出す</h1><p className="lead">あなた自身の過去の、習慣や長い期間ではなく、特定の一回の出来事を選んでください。少なくとも1週間前に起きた、安全に説明できる出来事にしてください。楽しかった、普通だった、つらかったなど、感情の種類は問いません。匂いや特定の感覚に意識を向ける必要はありません。</p><form onSubmit={submitRecall}><label htmlFor="fragment">その出来事を一文で書いてください</label><textarea id="fragment" value={fragment} maxLength={100} onChange={(event) => setFragment(event.target.value)} placeholder="例：休日に友人と公園を歩いた。" aria-describedby="fragment-hint" required /><p className="hint" id="fragment-hint">氏名、住所、電話番号などは書かないでください。{fragment.length} / 100文字</p><div className="actions"><button className="secondary" type="button" onClick={noRecall}>{recallAttempts === 0 ? "思い出せない" : "別の出来事も思い出せない"}</button><button className="primary" type="submit">この内容で進む</button></div></form></>}
      {step === "questions" && <><h1>記憶についての質問</h1><div className="progress-label"><span>質問 {currentQuestion + 1} / 6</span><span>回答は思い出せる範囲で</span></div><div className="progress" role="progressbar" aria-label="質問への回答の進行" aria-valuemin={1} aria-valuemax={6} aria-valuenow={currentQuestion + 1}><span style={{ transform: `scaleX(${questionProgress})` }} /></div><p className="question">{questionTexts[currentQuestion] || "APIから質問を取得しています…"}</p><form onSubmit={submitAnswer}><label htmlFor="answer">思い出せる範囲で答えてください</label><textarea id="answer" value={answers[currentQuestion]} onChange={(event) => setAnswers((current) => current.map((value, index) => index === currentQuestion ? event.target.value : value))} aria-describedby="answer-hint" disabled={busy || !questionTexts[currentQuestion]} required /><p className="hint" id="answer-hint">分からない、思い出せない、という回答でも構いません。</p><div className="actions"><button className="danger-link" type="button" onClick={() => setStep("done")} disabled={busy}>ここで中止する</button><button className="primary" type="submit" disabled={busy || !questionTexts[currentQuestion]}>{busy ? "生成中…" : currentQuestion === 5 ? "回答を終える" : "次の質問へ"}</button></div></form></>}
      {step === "narrative" && <><h1>作成された文章</h1><p className="lead">初期断片と回答だけを事実の材料に、実APIが整えた一人称文章です。質問文は回答対象を解釈する文脈としてだけ使われます。</p><div className="narrative">{narrative}</div><div className="callout">この文章は研究上の正確な記憶の再構築を保証するものではありません。</div><div className="actions"><button className="danger-link" type="button" onClick={() => setStep("done")}>ここで中止する</button><button className="primary" onClick={() => setStep("evaluation")}>文章を評価する</button></div></>}
      {step === "evaluation" && <><h1>文章についての評価</h1><p className="lead">文章を読み、以下の各項目で1〜7のいずれかを選んでください。初期値はありません。</p><fieldset className="group"><legend>文章について、各項目に回答してください</legend>{evaluationItems.map(({ id, text }) => <Rating key={id} id={id} text={text} value={ratings[id]} onChange={setRating} />)}</fieldset><div className="actions"><button className="danger-link" type="button" onClick={() => setStep("done")}>ここで中止する</button><button className="primary" disabled={!allRatingsAnswered} onClick={() => setStep("check")}>評価を確定して進む</button></div></>}
      {step === "check" && <><h1>質問についての確認</h1><p className="lead">質問がどこへ注意を向けたか、文章の品質について回答してください。</p><fieldset className="group"><legend>質問と文章について、各項目に回答してください</legend>{checks.map((item) => <Rating key={item.id} id={item.id} text={item.text} value={ratings[item.id]} lowLabel={item.low} highLabel={item.high} onChange={setRating} />)}</fieldset><div className="actions"><button className="danger-link" type="button" onClick={() => setStep("done")}>ここで中止する</button><button className="primary" disabled={!allChecksAnswered} onClick={() => setStep("debrief")}>確認を確定して進む</button></div></>}
      {step === "debrief" && <><h1>説明</h1><div className="copy"><p>この検証では、質問の向け方が、生成された文章の受け取られ方（評価）に与える影響を確認します。</p><p>質問条件は、出来事の構造、視覚、匂いに関する注意のいずれかでした。条件名は回答終了まで表示していません。</p><p>完了すると、初期断片、6つの質問と回答、質問の分岐記録、生成文章と証拠ID、条件、評価結果がこのPCの<code>data/results-v0.4.1.csv</code>へ1行で追記されます。</p></div><button className="primary" onClick={saveResult} disabled={busy || saved}>{busy ? "CSVへ保存中…" : "保存して完了する"}</button></>}
      {step === "done" && <div className="terminal"><div className="mark">✓</div><h1>{fragment ? "ご協力ありがとうございました" : "参加せずに終了しました"}</h1><p>{fragment ? (saved ? "結果をローカルCSVへ保存しました。" : "保存せずに終了しました。") : "入力や条件割付を行わずに終了しました。"}</p><button className="secondary" onClick={reset}>最初に戻る</button></div>}
    </section>
    <footer>研究実施前の検証用 mock ／ 条件・尺度・保存方針は DRAFT です</footer>
  </main>;
}

function Rating({ id, text, value, lowLabel = "全くそう感じない", highLabel = "非常に強くそう感じる", onChange }: { id: string; text: string; value?: number; lowLabel?: string; highLabel?: string; onChange: (id: string, value: number) => void }) {
  return <div className="rating"><p id={`${id}-label`}>{text}</p><div className="rating-options" role="radiogroup" aria-labelledby={`${id}-label`}>{[1, 2, 3, 4, 5, 6, 7].map((number) => <label key={number}><input type="radio" name={id} checked={value === number} onChange={() => onChange(id, number)} /><span>{number}</span></label>)}</div><div className="scale"><span>{lowLabel}</span><span>{highLabel}</span></div></div>;
}
