import { parseResultData } from "../../../lib/result-validation";
import { RESULT_CSV_PATH, RESULT_PROTOCOL_VERSION, RESULT_SCHEMA_VERSION } from "../../../lib/result-storage";
import { getResultStore, getStorageKind } from "../../../lib/server/result-store";
import { ResultStorageError } from "../../../lib/server/supabase-result-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const data = parseResultData(json);
  if (!data) return Response.json({ error: "Invalid result payload." }, { status: 400 });

  try {
    const storage = getStorageKind();
    const expectedStorage = (json as Record<string, unknown>).expectedStorage;
    if ((expectedStorage !== undefined && expectedStorage !== storage) ||
      (storage === "supabase" && data.recordType === "participant" && expectedStorage === undefined)) {
      return Response.json({ error: "Storage destination changed. Reload before starting a new session." }, { status: 409 });
    }
    const outcome = await getResultStore(storage).save({
      ...data,
      savedAt: new Date().toISOString(),
      protocolVersion: RESULT_PROTOCOL_VERSION,
      schemaVersion: RESULT_SCHEMA_VERSION,
    });
    return Response.json({ ...outcome, language: data.language, storage, ...(storage === "csv" ? { path: RESULT_CSV_PATH } : {}) });
  } catch (error) {
    const code = error instanceof ResultStorageError ? error.code : "STORAGE_FAILED";
    console.error("[result storage]", code);
    return Response.json({ error: "Could not save the result." }, { status: code === "SESSION_CONFLICT" ? 409 : 503 });
  }
}
