import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { RESULT_CSV_FILENAME } from "../result-storage";
import { resultCsvHeader, resultCsvRow } from "../result-csv";
import type { ResultRecord, ResultStore, SaveOutcome } from "../result";
import { ResultStorageError } from "./supabase-result-store";

function parseCsv(csv: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === "," || c === "\n")) { row.push(cell); cell = ""; if (c === "\n") { rows.push(row); row = []; } }
    else cell += c;
  }
  if (quoted) throw new Error("Result CSV contains an unterminated quoted cell.");
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function headerMatches(values: string[]) {
  return values.map((value) => `"${value.replace(/"/gu, '""')}"`).join(",") === resultCsvHeader;
}

function sameResearchContent(existing: string[], incoming: string[], savedAtIndex: number) {
  return existing.length === incoming.length && existing.every((value, index) => index === savedAtIndex || value === incoming[index]);
}

export function createCsvResultStore(directory: string): ResultStore {
  const csvPath = path.join(directory, RESULT_CSV_FILENAME);
  // One store/process serializes writes. Shared multi-process storage needs a
  // database with a unique session ID, not this local CSV adapter.
  let writeQueue = Promise.resolve();

  async function appendResult(record: ResultRecord): Promise<SaveOutcome> {
    const row = resultCsvRow(record);
    await mkdir(directory, { recursive: true });
    let existing = "";
    try {
      existing = await readFile(csvPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const header = resultCsvHeader;
    if (existing) {
      const parsed = parseCsv(existing);
      if (!parsed[0] || !headerMatches(parsed[0])) throw new Error("Result CSV header does not match the storage schema.");
      const incoming = parseCsv(row)[0];
      const sessionIndex = parsed[0].indexOf('session_id');
      const savedAtIndex = parsed[0].indexOf('saved_at');
      const prior = parsed.slice(1).find((candidate) => candidate[sessionIndex] === record.sessionId);
      if (prior) {
        if (sameResearchContent(prior, incoming, savedAtIndex)) return { saved: false, duplicate: true };
        throw new ResultStorageError("SESSION_CONFLICT", 409);
      }
    }
    const prefix = existing.length === 0 ? `${header}\n` : existing.endsWith("\n") ? "" : "\n";
    await appendFile(csvPath, `${prefix}${row}\n`, "utf8");
    return { saved: true, duplicate: false };
  }

  return {
    save(record) {
      const next = writeQueue.then(() => appendResult(record));
      writeQueue = next.then(() => undefined, () => undefined);
      return next;
    },
  };
}
