import type { GenerationMetadata } from "../lib/generation";
import type { DeveloperFailure } from "./experiment";

type Condition = "visual" | "odor";
type QuestionMetadata = { conditionFocus: Condition | "neutral"; targetEvidenceId: string | null; transitionReason?: "non_recall" | "insufficient_evidence" };
type DeveloperPanelProps = { language: string; storageKind: string; step: string; sessionId: string; condition: Condition | null; fragment: string; currentQuestion: number; questionTexts: string[]; questionMetadata: Array<QuestionMetadata | null>; questionGeneration: Array<GenerationMetadata | null>; narrativeGeneration: GenerationMetadata | null; failure: DeveloperFailure | null };

function display(value: unknown): string { return value === null || value === undefined || value === "" ? "—" : String(value); }

const rejectionReasons: Record<string, string> = {
  question_schema: "questionフィールドの形式が不正",
  condition_focus_schema: "conditionFocusの形式が不正",
  target_evidence_schema: "targetEvidenceIdの形式が不正",
  transition_reason_schema: "transitionReasonの形式が不正",
  invalid_condition_focus: "conditionFocusがvisual / odor / neutralのいずれでもない",
  condition_focus_mismatch: "割付条件と質問の焦点が一致しない",
  visual_odor_contamination: "Visual条件で匂いを尋ねている",
  visual_condition_contamination: "Visual条件で禁止された感覚・感情を尋ねている",
  odor_condition_contamination: "Odor条件で禁止された感覚・感情を尋ねている",
  odor_source_inference: "匂いの原因・発生源を推測させている",
  focused_question_with_transition: "条件内質問にtransitionReasonが付いている",
  neutral_without_transition: "中立質問にtransitionReasonがない",
  neutral_focus_contamination: "中立質問に感覚的な誘導が含まれる",
  study_disclosure: "研究・条件・AIなどを質問文で開示している",
  output_language_mismatch: "セッション言語と質問文の言語が一致しない",
  duplicate: "過去の質問と重複している",
  near_duplicate: "過去の質問と近似している",
  empty: "質問文が空",
};

function matchedTerms(question: string, terms: string[]): string {
  const matched = terms.filter((term) => question.toLowerCase().includes(term.toLowerCase()));
  return matched.length > 0 ? `検出語: ${matched.join("、")}` : "検出語は特定できませんでした";
}

function explainRejection(flags: string[], question = "", metadata?: Record<string, unknown>): string {
  return flags.map((flag) => {
    const base = rejectionReasons[flag];
    if (flag === "visual_odor_contamination") return `${base}。${matchedTerms(question, ["匂い", "におい", "香り", "臭い", "smell", "scent", "odor"])}`;
    if (flag === "odor_source_inference") return `${base}。${matchedTerms(question, ["原因", "なぜ", "どうして", "推測", "why", "guess", "cause"])}`;
    if (flag === "condition_focus_mismatch") return `${base}（返却値: conditionFocus=${display(metadata?.conditionFocus)}）`;
    if (flag === "invalid_target_evidence_id") return `${base}（返却値: targetEvidenceId=${display(metadata?.targetEvidenceId)}）`;
    if (flag === "focused_question_with_transition" || flag === "neutral_without_transition") return `${base}（返却値: transitionReason=${display(metadata?.transitionReason)}）`;
    return base ?? `未登録の生成診断: ${flag}`;
  }).join(" / ");
}

function GenerationDetails({ generation }: { generation: GenerationMetadata | null }) {
  if (!generation) return <span className="developer-muted">未取得</span>;
  return <>
    <div className="developer-generation-meta"><span>source={generation.source}</span><span>model={generation.model}</span><span>requestId={display(generation.requestId)}</span><span>prompt={generation.promptVersion}</span><span>attempts={generation.attempts}</span></div>
    <div className="developer-settings">settings: temperature={generation.settings.temperature}, candidates={generation.settings.candidateCount}, repairs={generation.settings.repairCount}, maxAttempts={generation.settings.maxAttempts}</div>
    {generation.fallbackReason && <div className="developer-fallback">fallbackReason={generation.fallbackReason}</div>}
    {generation.diagnostics.rejections.length > 0 && <details className="developer-rejections"><summary>棄却・不採用 {generation.diagnostics.rejections.length}件</summary><ol>{generation.diagnostics.rejections.map((rejection) => <li key={`${rejection.attempt}-${rejection.stage}`}><div>attempt {rejection.attempt} / {rejection.stage}</div><div className="developer-rejection-reason">理由: {explainRejection(rejection.flags, rejection.question, rejection.metadata)}</div><div className="developer-rejected-metadata">flags: {rejection.flags.join(", ")}</div>{rejection.question && <div className="developer-rejected-question">質問: {rejection.question}</div>}{rejection.metadata && <div className="developer-rejected-metadata">metadata: {JSON.stringify(rejection.metadata)}</div>}{(rejection.model || rejection.requestId) && <div className="developer-rejected-metadata">model={display(rejection.model)} requestId={display(rejection.requestId)}</div>}</li>)}</ol></details>}
  </>;
}

export default function DeveloperPanel(props: DeveloperPanelProps) {
  return <aside className="developer-panel" aria-label="Developer mode">
    <div className="developer-heading"><div><span className="developer-kicker">DEVELOPER MODE</span><h2>実験デバッグ情報</h2></div><span className="developer-live">非保存</span></div>
    <p className="developer-note">このパネルはURLで明示的に有効化した開発者向け表示です。参加者向け画面、生成入力、保存データには追加されません。</p>
    <dl className="developer-overview"><div><dt>step</dt><dd>{props.step}</dd></div><div><dt>condition</dt><dd>{props.condition ?? "未割付"}</dd></div><div><dt>language</dt><dd>{props.language}</dd></div><div><dt>storage</dt><dd>{props.storageKind}</dd></div><div><dt>sessionId</dt><dd>{display(props.sessionId)}</dd></div><div><dt>current turn</dt><dd>{props.step === "questions" ? props.currentQuestion + 1 : "—"} / 6</dd></div></dl>
    <section className="developer-section"><h3>初期断片</h3><p>{display(props.fragment)}</p></section>
    {props.failure && <section className="developer-section developer-failure"><h3>直近の生成失敗</h3><dl className="developer-metadata"><div><dt>stage</dt><dd>{props.failure.stage}</dd></div><div><dt>status</dt><dd>{display(props.failure.status)}</dd></div><div><dt>code</dt><dd>{display(props.failure.code)}</dd></div></dl>{props.failure.rejectionFlags && props.failure.rejectionFlags.length > 0 && <p>検証フラグ: {props.failure.rejectionFlags.join(", ")}</p>}</section>}
    <section className="developer-section"><h3>質問生成過程</h3><div className="developer-question-list">{props.questionTexts.map((question, index) => <article className={index === props.currentQuestion && props.step === "questions" ? "developer-question current" : "developer-question"} key={index}><h4>turn {index + 1} <span>{question ? "取得済み" : "未取得"}</span></h4><p className="developer-question-text">{display(question)}</p><dl className="developer-metadata"><div><dt>conditionFocus</dt><dd>{display(props.questionMetadata[index]?.conditionFocus)}</dd></div><div><dt>targetEvidenceId</dt><dd>{display(props.questionMetadata[index]?.targetEvidenceId)}</dd></div><div><dt>transitionReason</dt><dd>{display(props.questionMetadata[index]?.transitionReason)}</dd></div></dl><GenerationDetails generation={props.questionGeneration[index]} /></article>)}</div></section>
    <section className="developer-section"><h3>物語生成</h3><GenerationDetails generation={props.narrativeGeneration} /></section>
  </aside>;
}
