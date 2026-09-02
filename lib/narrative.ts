import { DEFAULT_LANGUAGE, matchesOutputLanguage, type Language } from "./language";
import { studyDisclosurePattern } from "./content-validation";

export type NarrativeSentence = {
  text: string;
  sourceIds: string[];
  containsCreativeAddition: boolean;
};

// Structural checks only. Source references and creative additions are model self-reports.
export function validateNarrativeSentences(value: unknown, answerCount: number, maxSentences: number, language: Language = DEFAULT_LANGUAGE) {
  if (!Array.isArray(value)) return ["sentences_schema"];
  const flags: string[] = [];
  const allowedIds = new Set(["fragment", ...Array.from({ length: answerCount }, (_, index) => `answer-${index + 1}`)]);
  const texts = new Set<string>();
  if (value.length < 1 || value.length > maxSentences) flags.push("sentence_count");
  value.forEach((item: unknown, index) => {
    const prefix = `sentence_${index + 1}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      flags.push(`${prefix}_schema`);
      return;
    }
    const sentence = item as Record<string, unknown>;
    if (Object.keys(sentence).some((key) => !["text", "sourceIds", "containsCreativeAddition"].includes(key))) flags.push(`${prefix}_schema`);
    if (typeof sentence.text !== "string" || !sentence.text.trim()) {
      flags.push(`${prefix}_empty`);
    } else {
      const text = sentence.text.trim();
      if (texts.has(text)) flags.push("duplicate_sentence");
      texts.add(text);
      const sentenceCount = language === "en"
        ? Array.from(new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)).length
        : (text.match(/[。！？!?]/gu) ?? []).length;
      const hasEnding = language === "en" ? /[.!?]["'”’)]*$/u.test(text) : true;
      if (sentenceCount !== 1 || !hasEnding) flags.push(`${prefix}_punctuation`);
      if (studyDisclosurePattern.test(text)) flags.push(`${prefix}_disclosure`);
      if (!matchesOutputLanguage(text, language)) flags.push(`${prefix}_language_mismatch`);
    }
    if (typeof sentence.containsCreativeAddition !== "boolean") flags.push(`${prefix}_creative_addition_schema`);
    if (!Array.isArray(sentence.sourceIds) || sentence.sourceIds.some((id: unknown) => typeof id !== "string")) {
      flags.push(`${prefix}_sources_schema`);
    } else {
      if (new Set(sentence.sourceIds).size !== sentence.sourceIds.length) flags.push(`${prefix}_duplicate_source`);
      if (sentence.sourceIds.some((id: string) => !allowedIds.has(id))) flags.push(`${prefix}_unknown_source`);
      if (sentence.sourceIds.length === 0 && sentence.containsCreativeAddition === false) flags.push(`${prefix}_unattributed_content`);
    }
  });
  return [...new Set(flags)];
}
