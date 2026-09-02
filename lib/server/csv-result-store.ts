import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { RESULT_CSV_FILENAME } from "../result-storage";
import { resultCsvHeader, resultCsvRow } from "../result-csv";
import type { ResultRecord, ResultStore, SaveOutcome } from "../result";

// Newlines and commas inside quoted answers must not be mistaken for records.
function hasSessionId(csv: string, sessionId: string) {
  let quoted = false;
  let firstColumn = true;
  let cell = "";
  for (let index = 0; index < csv.length; index++) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        if (firstColumn) cell += '"';
        index++;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      if (firstColumn && cell === sessionId) return true;
      firstColumn = false;
      cell = "";
    } else if (character === "\n" && !quoted) {
      firstColumn = true;
      cell = "";
    } else if (firstColumn) cell += character;
  }
  return false;
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
    if (existing && existing.split(/\r?\n/u)[0] !== header) throw new Error("Result CSV header does not match the storage schema.");
    if (hasSessionId(existing.slice(existing.indexOf("\n") + 1), record.sessionId)) return { saved: false, duplicate: true };
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
