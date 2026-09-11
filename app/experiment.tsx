"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGE_STORAGE_KEY, type Language } from "../lib/language";
import { translate, type MessageKey } from "../lib/ui-language";
import { RESULT_CSV_PATH, type StorageKind } from "../lib/result-storage";
import type { NarrativeSentence } from "../lib/narrative";
import { checks, evaluationItems } from "../lib/survey";
import type { ResultData } from "../lib/result";
import { readGenerationMetadata, type GenerationMetadata } from "../lib/generation";
import ReferenceMaterials from "./reference-materials";

type Step = "welcome" | "consent" | "recall" | "questions" | "narrative" | "evaluation" | "check" | "debrief" | "done";
type Condition = "visual" | "odor";
type QuestionMetadata = {
  conditionFocus: Condition | "neutral";
  targetEvidenceId: string | null;
  transitionReason?: "non_recall" | "insufficient_evidence";
};

const workflowSteps: Exclude<Step, "done">[] = ["welcome", "consent", "recall", "questions", "narrative", "evaluation", "check", "debrief"];

async function callApi(path: string, body: Record<string, unknown>, language: Language) {
  const t = (key: MessageKey) => translate(language, key);
  const failureMessage = path === "/api/save-result"
    ? t("結果の保存に失敗しました。入力を保持したまま、もう一度お試しください。")
    : t("生成に失敗しました。入力内容を確認して、もう一度お試しください。");
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, language }),
  }).catch(() => { throw new Error(failureMessage); });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    if (payload?.error === "Storage destination changed. Reload before starting a new session.") {
      throw new Error(t("保存先の設定が変更されました。ページを開き直し、新しい検証を開始してください。"));
    }
    if (payload?.error === "OPENAI_API_KEY is not configured on the server.") {
      throw new Error(t("実APIの設定がありません。サーバーの環境変数を確認してください。"));
    }
    throw new Error(failureMessage);
  }
  if (!payload || typeof payload !== "object") throw new Error(failureMessage);
  const generation = path === "/api/save-result" ? null : readGenerationMetadata(payload);
  if (path !== "/api/save-result" && !generation) throw new Error(failureMessage);
  return { ...payload, generation } as {
    question?: string;
    metadata?: QuestionMetadata;
    narrative?: string;
    sentences?: NarrativeSentence[];
    promptVersion?: string;
    saved?: boolean;
    duplicate?: boolean;
    generation: GenerationMetadata | null;
  };
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Server-side stratified block assignment is gated by TASK-016; this keeps
// the current mock on the required two-condition surface until that decision.
function randomCondition(): Condition {
  return Math.random() < 0.5 ? "visual" : "odor";
}

export default function Experiment({ storageKind }: { storageKind: StorageKind }) {
  const cloudStorage = storageKind === "supabase";
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [languageReady, setLanguageReady] = useState(false);
  const t = (key: MessageKey) => translate(language, key);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLanguage(stored)) setLanguage(stored);
    } catch { /* Language switching still works when browser storage is unavailable. */ }
    setLanguageReady(true);
  }, []);

  useEffect(() => {
    if (!languageReady) return;
    document.documentElement.lang = language;
    document.title = translate(language, "記憶に関する研究 | Mock");
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* Optional preference persistence. */ }
  }, [language, languageReady]);
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
  const [narrativeGeneration, setNarrativeGeneration] = useState<GenerationMetadata | null>(null);
  const [questionGeneration, setQuestionGeneration] = useState<Array<GenerationMetadata | null>>(Array(6).fill(null));
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

  const languageLocked = busy || !["welcome", "consent", "recall"].includes(step);

  function changeLanguage(next: Language) {
    if (languageLocked || !languageReady || next === language) return;
    setLanguage(next);
    setConsent(false);
    if (step === "recall") setStep("consent");
    setError(null);
  }

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
    setQuestionGeneration(Array(6).fill(null));
    setCurrentQuestion(0);
    setStep("questions");
    try {
      const payload = await callApi("/api/follow-up", {
        condition: assignedCondition,
        fragment,
        history: [],
        turn: 1,
      }, language);
      if (!payload.question || !payload.metadata || !payload.generation) throw new Error(t("実APIから検証済み質問を受け取れませんでした。"));
      setQuestionTexts((current) => current.map((value, index) => index === 0 ? payload.question! : value));
      setQuestionMetadata((current) => current.map((value, index) => index === 0 ? payload.metadata! : value));
      setQuestionGeneration((current) => current.map((value, index) => index === 0 ? payload.generation! : value));
    } catch (caught) {
      setAnswers(Array(6).fill(""));
      setQuestionTexts(Array(6).fill(""));
      setQuestionMetadata(Array(6).fill(null));
      setQuestionGeneration(Array(6).fill(null));
      setCurrentQuestion(0);
      setCondition(null);
      setStep("recall");
      setError(caught instanceof Error ? caught.message : t("生成に失敗しました。もう一度お試しください。"));
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
    if (saved || busy || !sessionId || !condition || !fragment.trim() || questionTexts.length !== 6 || answers.length !== 6 || !narrative.trim() || !narrativeGeneration || questionGeneration.some((item) => !item) || !allRatingsAnswered || !allChecksAnswered) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await callApi("/api/save-result", {
        sessionId,
        expectedStorage: storageKind,
        recordType: "participant",
        condition,
        fragment,
        questions: questionTexts,
        questionMetadata: questionMetadata.filter((item): item is QuestionMetadata => item !== null),
        questionGeneration: questionGeneration.filter((item): item is GenerationMetadata => item !== null),
        answers,
        finalResult: narrative,
        narrativeSentences,
        narrativePromptVersion: narrativeGeneration.promptVersion,
        narrativeGeneration,
        evaluation: Object.fromEntries(evaluationItems.map(({ id }) => [id, ratings[id]])),
        checks: Object.fromEntries(checks.map(({ id }) => [id, ratings[id]])),
      } satisfies Omit<ResultData, "language"> & { expectedStorage: StorageKind }, language);
      if (!payload.saved && !payload.duplicate) throw new Error(t("結果の保存に失敗しました。もう一度お試しください。"));
      setSaved(true);
      setStep("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("結果の保存に失敗しました。もう一度お試しください。"));
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
        }, language);
        if (!payload.narrative || !payload.sentences || !payload.generation) throw new Error(t("実APIから文章を受け取れませんでした。"));
        setNarrative(payload.narrative);
        setNarrativeSentences(payload.sentences ?? []);
        setNarrativeGeneration(payload.generation);
        setStep("narrative");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t("生成に失敗しました。もう一度お試しください。"));
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
      }, language);
      if (!payload.question || !payload.metadata || !payload.generation) throw new Error(t("実APIから検証済み質問を受け取れませんでした。"));
      setQuestionTexts((current) => current.map((value, index) => index === currentQuestion + 1 ? payload.question! : value));
      setQuestionMetadata((current) => current.map((value, index) => index === currentQuestion + 1 ? payload.metadata! : value));
      setQuestionGeneration((current) => current.map((value, index) => index === currentQuestion + 1 ? payload.generation! : value));
      setCurrentQuestion(currentQuestion + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("生成に失敗しました。もう一度お試しください。"));
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
    setQuestionGeneration(Array(6).fill(null));
    setCurrentQuestion(0);
    setCondition(null);
    setSessionId("");
    setSaved(false);
    setNarrative("");
    setNarrativeSentences([]);
    setNarrativeGeneration(null);
    setRatings({});
    setError(null);
  }

  return <main className="shell" lang={language}>
    <div className="language-controls">
      <div role="group" aria-label={t("言語")} aria-describedby="language-hint" className="language-options">
        {(["ja", "en"] as const).map((option) => <button key={option} type="button" lang={option} aria-pressed={language === option} disabled={languageLocked || !languageReady} onClick={() => changeLanguage(option)}>{option === "ja" ? "日本語" : "English"}</button>)}
      </div>
      <p className="hint" id="language-hint">{languageLocked ? t("質問開始後は言語を変更できません。終了して最初に戻ると変更できます。") : t("表示と生成に使う言語を選択してください。")}</p>
    </div>
    <div className="notice">{t(cloudStorage ? "これは接続検証用です。入力内容をOpenAI APIへ送信し、完了時に結果をSupabaseのクラウドDBへ保存します。" : "これはローカル検証用です。質問生成と文章生成で実OpenAI APIを呼び出し、入力内容を外部へ送信します。完了時に結果をローカルCSVへ保存します。")}</div>
    <section className="panel" aria-busy={busy}>
      {error && <div className="error-alert" role="alert">{error}</div>}
      {busy && <div className="status-line" role="status">{step === "debrief" ? t("結果を保存中…") : t("OpenAI APIへ送信中…")}</div>}
      {step !== "done" && <div className="workflow-status">
        <div className="workflow-copy"><span>{t("進行")}</span><span>STEP {workflowStep} / {workflowSteps.length}</span></div>
        <div className="workflow-track" role="progressbar" aria-label={t("全体の進行")} aria-valuemin={1} aria-valuemax={workflowSteps.length} aria-valuenow={workflowStep} aria-valuetext={`${t("ステップ")} ${workflowStep} / ${workflowSteps.length}`}><span style={{ transform: `scaleX(${workflowProgress})` }} /></div>
      </div>}
      {step === "welcome" && <><h1>{language === "en" ? "Create a short story about a past event" : <><span className="title-line"><span className="title-phrase">過去の出来事</span><wbr /><span className="title-phrase">について</span></span><span className="title-line"><span className="title-phrase">短い文章を</span><wbr /><span className="title-phrase">作ります</span></span></>}</h1><p className="lead">{t("あなたの断片的な記憶と、質問への回答を材料に、実APIで質問と文章を生成し、その文章について評価します。")}</p><div className="callout"><strong>{t("質問条件は参加者画面に表示しません")}</strong><br />{t("有効な初期断片を入力した後、質問条件へ割り付けます。")}</div><button className="primary" onClick={() => setStep("consent")}>{t("説明を読む")}</button></>}
      {step === "consent" && <><h1>{t("参加前の説明")}</h1><div className="copy"><p>{t("この検証は、自伝的記憶に関する質問と、AIが作る物語への評価の流れを確認するためのものです。")}</p><p>{t("AIは初期断片と回答を素材に物語を創作します。回答にない情景や感情、出来事が加わることがあります。生成文章は、実際の記憶を復元した記録ではありません。")}</p><p>{t(cloudStorage ? "入力した記憶内容と質問への回答は、質問生成と文章生成のためにOpenAI APIへ送信されます。完了時には、初期断片、質問、回答、生成文章、評価結果をSupabaseのクラウドDBへ保存します。" : "入力した記憶内容と質問への回答は、質問生成と文章生成のためにOpenAI APIへ送信されます。完了時には、初期断片、質問、回答、生成文章、評価結果をこのPCのローカルCSVへ保存します。")}</p><p>{t(cloudStorage ? "現在は架空の出来事による接続検証の段階です。人間の研究参加には使用しないでください。OpenAIとSupabaseでのデータ取扱いを確認してください。" : "API側のデータ取扱いと、このPCのCSVファイルの管理方法を確認してください。安全に説明できる出来事を選び、答えたくない場合はいつでも中止できます。")}</p></div><label className="check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />{t(cloudStorage ? "説明を読み、物語にAIの創作が含まれること、OpenAI APIへの送信とSupabaseへの保存を理解して検証を開始します。" : "説明を読み、物語にAIの創作が含まれること、実APIへの送信とローカルCSVへの保存を理解して検証を開始します。")}</label><div className="actions"><button className="secondary" onClick={() => setStep("done")}>{t("参加しない")}</button><button className="primary" disabled={!consent} onClick={() => setStep("recall")}>{t("同意して進む")}</button></div></>}
      {step === "recall" && <><h1>{t("一つの出来事を思い出す")}</h1><p className="lead">{t("あなた自身の過去の、習慣や長い期間ではなく、特定の一回の出来事を選んでください。少なくとも1週間前に起きた、安全に説明できる出来事にしてください。楽しかった、普通だった、つらかったなど、感情の種類は問いません。匂いや特定の感覚に意識を向ける必要はありません。")}</p><form onSubmit={submitRecall}><label htmlFor="fragment">{t("その出来事を一文で書いてください")}</label><textarea id="fragment" value={fragment} maxLength={100} onChange={(event) => setFragment(event.target.value)} placeholder={t("例：休日に友人と公園を歩いた。")} aria-describedby="fragment-hint" required /><p className="hint" id="fragment-hint">{t("氏名、住所、電話番号などは書かないでください。")} {fragment.length} / 100 {t("文字")}</p><div className="actions"><button className="secondary" type="button" onClick={noRecall}>{recallAttempts === 0 ? t("思い出せない") : t("別の出来事も思い出せない")}</button><button className="primary" type="submit">{t("この内容で進む")}</button></div></form></>}
      {step === "questions" && <><h1>{t("記憶についての質問")}</h1><div className="progress-label"><span>{t("質問")} {currentQuestion + 1} / 6</span><span>{t("回答は思い出せる範囲で")}</span></div><div className="progress" role="progressbar" aria-label={t("質問への回答の進行")} aria-valuemin={1} aria-valuemax={6} aria-valuenow={currentQuestion + 1}><span style={{ transform: `scaleX(${questionProgress})` }} /></div><p className="question">{questionTexts[currentQuestion] || t("APIから質問を取得しています…")}</p><form onSubmit={submitAnswer}><label htmlFor="answer">{t("思い出せる範囲で答えてください")}</label><textarea id="answer" value={answers[currentQuestion]} onChange={(event) => setAnswers((current) => current.map((value, index) => index === currentQuestion ? event.target.value : value))} aria-describedby="answer-hint" disabled={busy || !questionTexts[currentQuestion]} required /><p className="hint" id="answer-hint">{t("分からない、思い出せない、という回答でも構いません。")}</p><div className="actions"><button className="danger-link" type="button" onClick={() => setStep("done")} disabled={busy}>{t("ここで中止する")}</button><button className="primary" type="submit" disabled={busy || !questionTexts[currentQuestion]}>{busy ? t("生成中…") : currentQuestion === 5 ? t("回答を終える") : t("次の質問へ")}</button></div></form></>}
      {step === "narrative" && <><h1>{t("作成された文章")}</h1><p className="lead">{t("あなたの初期断片と回答を素材に、AIが創作した一人称の物語です。")}</p><div className="narrative">{narrative}</div><div className="callout">{t("回答にない描写や出来事が含まれることがあります。実際の記憶を復元した記録ではありません。")}</div><div className="actions"><button className="danger-link" type="button" onClick={() => setStep("done")}>{t("ここで中止する")}</button><button className="primary" onClick={() => setStep("evaluation")}>{t("文章を評価する")}</button></div></>}
      {step === "evaluation" && <><h1>{t("文章についての評価")}</h1><p className="lead">{t("文章を読み、以下の各項目で1〜7のいずれかを選んでください。初期値はありません。")}</p><ReferenceMaterials language={language} key="evaluation" narrative={narrative} /><fieldset className="group"><legend>{t("文章について、各項目に回答してください")}</legend>{evaluationItems.map(({ id, text }) => <Rating language={language} key={id} id={id} text={t(text)} value={ratings[id]} onChange={setRating} />)}</fieldset><div className="actions"><button className="danger-link" type="button" onClick={() => setStep("done")}>{t("ここで中止する")}</button><button className="primary" disabled={!allRatingsAnswered} onClick={() => setStep("check")}>{t("評価を確定して進む")}</button></div></>}
      {step === "check" && <><h1>{t("質問についての確認")}</h1><p className="lead">{t("質問がどこへ注意を向けたか、文章の品質について回答してください。")}</p><ReferenceMaterials language={language} key="check" narrative={narrative} questions={questionTexts} /><fieldset className="group"><legend>{t("質問と文章について、各項目に回答してください")}</legend>{checks.map((item) => <Rating language={language} key={item.id} id={item.id} text={t(item.text)} value={ratings[item.id]} lowLabel={t(item.low)} highLabel={t(item.high)} onChange={setRating} />)}</fieldset><div className="actions"><button className="danger-link" type="button" onClick={() => setStep("done")}>{t("ここで中止する")}</button><button className="primary" disabled={!allChecksAnswered} onClick={() => setStep("debrief")}>{t("確認を確定して進む")}</button></div></>}
      {step === "debrief" && <><h1>{t("説明")}</h1><div className="copy"><p>{t("この検証では、質問の向け方が、AIの創作を含む物語の受け取られ方に与える影響を確認します。文章には回答にない描写や出来事が含まれることがあります。")}</p><p>{t("質問条件は、出来事の構造、視覚、匂いに関する注意のいずれかでした。条件名は回答終了まで表示していません。")}</p><p>{cloudStorage ? t("完了すると、初期断片、6つの質問と回答、生成文章、生成記録、条件、言語、評価結果をSupabaseのクラウドDBへ保存します。") : <>{t("完了すると、初期断片、6つの質問と回答、質問の分岐記録、生成文章と作成記録、条件、言語、評価結果がこのPCの次のファイルへ1行で追記されます。")} <code>{RESULT_CSV_PATH}</code></>}</p></div><button className="primary" onClick={saveResult} disabled={busy || saved}>{busy ? t("結果を保存中…") : t("保存して完了する")}</button></>}
      {step === "done" && <div className="terminal"><div className="mark">✓</div><h1>{fragment ? t("ご協力ありがとうございました") : t("参加せずに終了しました")}</h1><p>{fragment ? (saved ? t(cloudStorage ? "結果をSupabaseへ保存しました。" : "結果をローカルCSVへ保存しました。") : t("保存せずに終了しました。")) : t("入力や条件割付を行わずに終了しました。")}</p><button className="secondary" onClick={reset}>{t("最初に戻る")}</button></div>}
    </section>
    <footer>{t("研究実施前の検証用 mock ／ 条件・尺度・保存方針は DRAFT です")}</footer>
  </main>;
}

function Rating({ language, id, text, value, lowLabel, highLabel, onChange }: { language: Language; id: string; text: string; value?: number; lowLabel?: string; highLabel?: string; onChange: (id: string, value: number) => void }) {
  return <div className="rating"><p id={`${id}-label`}>{text}</p><div className="rating-options" role="radiogroup" aria-labelledby={`${id}-label`}>{[1, 2, 3, 4, 5, 6, 7].map((number) => <label key={number}><input type="radio" name={id} checked={value === number} onChange={() => onChange(id, number)} /><span>{number}</span></label>)}</div><div className="scale"><span>{lowLabel ?? translate(language, "全くそう感じない")}</span><span>{highLabel ?? translate(language, "非常に強くそう感じる")}</span></div></div>;
}
