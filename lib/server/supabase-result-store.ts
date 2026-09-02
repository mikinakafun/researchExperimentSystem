// This module is only for server routes and local administrator scripts.
import { isDeepStrictEqual } from "node:util";
import type { ResultRecord, ResultStore, SaveOutcome } from "../result";

export class ResultStorageError extends Error {
  constructor(public readonly code: string, public readonly status = 500) {
    super(`Result storage failed (${code}).`);
  }
}

export function supabaseConfig(env: NodeJS.ProcessEnv = process.env) {
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  let url: URL;
  try { url = new URL(env.SUPABASE_URL ?? ""); }
  catch { throw new ResultStorageError("INVALID_SUPABASE_URL"); }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co") || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/") {
    throw new ResultStorageError("INVALID_SUPABASE_URL");
  }
  if (!secretKey?.startsWith("sb_secret_")) throw new ResultStorageError("MISSING_SUPABASE_SECRET_KEY");
  return { url: url.origin, secretKey };
}

type Row = { session_id: string; payload: ResultRecord };
function readRows(value: unknown): Row[] {
  if (!Array.isArray(value) || value.some((row) => !row || typeof row.session_id !== "string" ||
    !row.payload || row.payload.sessionId !== row.session_id || typeof row.payload.savedAt !== "string" ||
    !Array.isArray(row.payload.questions) || !Array.isArray(row.payload.answers))) {
    throw new ResultStorageError("INVALID_RESPONSE");
  }
  return value as Row[];
}

export interface SupabaseResultStore extends ResultStore {
  read(sessionId: string): Promise<ResultRecord | null>;
  records(pageSize?: number): AsyncGenerator<ResultRecord>;
}

export function createSupabaseResultStore(
  config = supabaseConfig(),
  fetcher: typeof fetch = fetch,
): SupabaseResultStore {
  async function request(query: Record<string, string>, body?: unknown) {
    const url = new URL(`${config.url}/rest/v1/experiment_results`);
    url.search = new URLSearchParams(query).toString();
    let response: Response;
    try {
      response = await fetcher(url, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          apikey: config.secretKey,
          "content-type": "application/json",
          ...(body === undefined ? {} : { Prefer: "return=minimal" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      // Do not propagate URLs, request headers, database details, or answer text.
      throw new ResultStorageError("CONNECTION_FAILED", 503);
    }
    if (!response.ok) {
      const problem = await response.json().catch(() => null);
      const code = typeof problem?.code === "string" && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/u.test(problem.code)
        ? problem.code : `HTTP_${response.status}`;
      throw new ResultStorageError(code, response.status);
    }
    if (body !== undefined) return [];
    return readRows(await response.json().catch(() => null));
  }

  async function read(sessionId: string) {
    // eq/gt use literal scalar values. URLSearchParams handles URL escaping;
    // JSON.stringify would make the quotes part of the ID being compared.
    const rows = await request({ select: "session_id,payload", session_id: `eq.${sessionId}`, limit: "1" });
    return rows[0]?.payload ?? null;
  }

  return {
    read,
    async save(record): Promise<SaveOutcome> {
      try {
        await request({}, { session_id: record.sessionId, payload: record });
        return { saved: true, duplicate: false };
      } catch (error) {
        if (!(error instanceof ResultStorageError) || error.code !== "23505") throw error;
        const existing = await read(record.sessionId);
        // Repeated HTTP submissions get a new savedAt. All research fields must match.
        if (!existing || !isDeepStrictEqual({ ...existing, savedAt: undefined }, { ...record, savedAt: undefined })) {
          throw new ResultStorageError("SESSION_CONFLICT", 409);
        }
        return { saved: false, duplicate: true };
      }
    },
    async *records(pageSize = 500) {
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new ResultStorageError("INVALID_PAGE_SIZE");
      let cursor: string | undefined;
      while (true) {
        const rows = await request({
          select: "session_id,payload", order: "session_id.asc", limit: String(pageSize),
          ...(cursor === undefined ? {} : { session_id: `gt.${cursor}` }),
        });
        if (rows.length === 0) return;
        const nextCursor = rows[rows.length - 1].session_id;
        if (nextCursor === cursor) throw new ResultStorageError("PAGINATION_STALLED");
        for (const row of rows) yield row.payload;
        cursor = nextCursor;
        // Keep reading until empty, even when the server caps pages below pageSize.
      }
    },
  };
}
