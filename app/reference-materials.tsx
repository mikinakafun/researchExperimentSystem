"use client";

import { useId, useState } from "react";
import type { Language } from "../lib/language";
import { translate, type MessageKey } from "../lib/ui-language";

export default function ReferenceMaterials({ language, narrative, questions }: { language: Language; narrative: string; questions?: string[] }) {
  const t = (key: MessageKey) => translate(language, key);
  const [open, setOpen] = useState<"narrative" | "questions" | null>(null);
  const id = useId();

  return <aside className="reference-materials" aria-label={t("評価対象を見返す")}>
    <div className="reference-actions">
      {questions && <button
        className="secondary"
        type="button"
        aria-expanded={open === "questions"}
        aria-controls={`${id}-questions`}
        onClick={() => setOpen((current) => current === "questions" ? null : "questions")}
      >{open === "questions" ? t("質問を閉じる") : t("質問を見返す")}</button>}
      <button
        className="secondary"
        type="button"
        aria-expanded={open === "narrative"}
        aria-controls={`${id}-narrative`}
        onClick={() => setOpen((current) => current === "narrative" ? null : "narrative")}
      >{open === "narrative" ? t("文章を閉じる") : t("文章を見返す")}</button>
    </div>
    {questions && <div
      id={`${id}-questions`}
      className="reference-content"
      role="region"
      aria-label={t("提示された質問")}
      tabIndex={0}
      hidden={open !== "questions"}
    >
      <ol className="reference-questions">{questions.map((question, index) => <li key={index}>{question}</li>)}</ol>
    </div>}
    <div
      id={`${id}-narrative`}
      className="reference-content"
      role="region"
      aria-label={t("作成された文章")}
      tabIndex={0}
      hidden={open !== "narrative"}
    >
      <p className="reference-narrative">{narrative}</p>
    </div>
  </aside>;
}
