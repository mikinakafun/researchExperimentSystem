import path from "node:path";
import type { ResultStore } from "../result";
import type { StorageKind } from "../result-storage";
import { createCsvResultStore } from "./csv-result-store";
import { createSupabaseResultStore, ResultStorageError } from "./supabase-result-store";

export function getStorageKind(env: NodeJS.ProcessEnv = process.env): StorageKind {
  const kind = env.RESULT_STORAGE?.trim() || "csv";
  if (kind !== "csv" && kind !== "supabase") throw new ResultStorageError("INVALID_RESULT_STORAGE");
  if (env.VERCEL && kind === "csv") throw new ResultStorageError("CSV_NOT_SUPPORTED_ON_VERCEL");
  return kind;
}

// Capture the local directory once; keep one CSV write queue per server process.
const csvStore = createCsvResultStore(path.join(process.cwd(), "data"));
let supabaseStore: ResultStore | undefined;

export function getResultStore(kind: StorageKind): ResultStore {
  if (kind === "csv") return csvStore;
  return supabaseStore ??= createSupabaseResultStore();
}
