export const LANGUAGES = ["ja", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "ja";
export const LANGUAGE_STORAGE_KEY = "research-pilot-language";

export function isLanguage(value: unknown): value is Language {
  return value === "ja" || value === "en";
}

// Omitted language keeps older API clients compatible; invalid values are rejected.
export function parseLanguage(value: unknown): Language | null {
  return value === undefined ? DEFAULT_LANGUAGE : isLanguage(value) ? value : null;
}

export function joinNarrative(sentences: Array<{ text: string }>, language: Language) {
  return sentences.map((sentence) => sentence.text.trim()).join(language === "en" ? " " : "");
}

// A lightweight script check, not a general-purpose language classifier.
export function matchesOutputLanguage(text: string, language: Language) {
  const hasJapanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text);
  return language === "ja" ? hasJapanese : /[a-z]/iu.test(text) && !hasJapanese;
}
