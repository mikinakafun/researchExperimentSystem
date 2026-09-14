// Browser-safe constants. Never append a new schema to an older result file.
export const RESULT_SCHEMA_VERSION = "3";
export const RESULT_PROTOCOL_VERSION = "v0.4.0-draft";
export const RESULT_CSV_FILENAME = "results-v0.4.4-bilingual-two-condition-schema-v3.csv";
export const RESULT_CSV_PATH = `data/${RESULT_CSV_FILENAME}`;

export type StorageKind = "csv" | "supabase";
