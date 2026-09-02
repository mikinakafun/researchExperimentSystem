// English words must be bounded: "AI" must not reject "said", "air", or "again".
export const studyDisclosurePattern = /(?:条件|仮説|実験|研究|割り?付け|プロンプト|\b(?:AI|conditions?|hypothes(?:is|es)|experiments?|research|study|prompts?|instructions?)\b)/iu;
