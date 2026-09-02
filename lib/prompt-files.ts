import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SAFE_PROMPT_PATH = /^(?:[a-z0-9._-]+\/)*[a-z0-9._-]+$/u;

export function readPrompt(relativePath: string) {
  if (!SAFE_PROMPT_PATH.test(relativePath) || relativePath.split("/").some((part) => part === "." || part === "..")) {
    throw new Error(`Unsafe prompt path: ${relativePath}`);
  }

  const path = resolve(process.cwd(), "prompts", relativePath);
  const text = readFileSync(path, "utf8").replace(/\r\n?/gu, "\n").trim();
  if (!text) throw new Error(`Prompt file is empty: ${path}`);
  return text;
}

export function renderPrompt(
  relativePath: string,
  values: Record<string, string>,
) {
  const template = readPrompt(relativePath);
  const rendered = template.replace(/\{\{([A-Z0-9_]+)\}\}/gu, (match, key) => {
    if (!(key in values)) throw new Error(`Missing prompt variable ${key} in ${relativePath}`);
    return values[key];
  });
  const unresolved = rendered.match(/\{\{[A-Z0-9_]+\}\}/gu);
  if (unresolved) throw new Error(`Unresolved prompt variables in ${relativePath}: ${unresolved.join(", ")}`);
  return rendered.trim();
}

export function readPromptSection(relativePath: string, section: string) {
  const lines = readPrompt(relativePath).split("\n");
  const heading = `[${section}]`;
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) throw new Error(`Prompt section not found: ${relativePath}#${section}`);
  const end = lines.findIndex((line, index) => index > start && /^\[[^\]]+\]$/u.test(line.trim()));
  const text = lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
  if (!text) throw new Error(`Prompt section is empty: ${relativePath}#${section}`);
  return text;
}
