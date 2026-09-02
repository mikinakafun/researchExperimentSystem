-- Run once in the SQL Editor of 26labResearch. No participant data is inserted.
-- Fail if a table already exists: do not silently accept an incompatible schema.
begin;

create table public.experiment_results (
  session_id text primary key check (char_length(session_id) between 1 and 200),
  received_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  record_type text generated always as (payload ->> 'recordType') stored not null
    check (record_type in ('participant', 'batch_synthetic')),
  condition text generated always as (payload ->> 'condition') stored not null
    check (condition in ('standard', 'visual', 'odor')),
  language text generated always as (payload ->> 'language') stored not null
    check (language in ('ja', 'en')),
  schema_version text generated always as (payload ->> 'schemaVersion') stored not null
    check (schema_version = '2'),
  protocol_version text generated always as (payload ->> 'protocolVersion') stored not null,
  prompt_version text generated always as (payload ->> 'narrativePromptVersion') stored not null,
  constraint payload_session_matches check ((payload ->> 'sessionId') is not null and payload ->> 'sessionId' = session_id),
  constraint payload_saved_at_exists check (jsonb_typeof(payload -> 'savedAt') is not distinct from 'string'),
  constraint six_questions check (jsonb_typeof(payload -> 'questions') is not distinct from 'array' and jsonb_array_length(payload -> 'questions') = 6),
  constraint six_answers check (jsonb_typeof(payload -> 'answers') is not distinct from 'array' and jsonb_array_length(payload -> 'answers') = 6),
  constraint six_generations check (jsonb_typeof(payload -> 'questionGeneration') is not distinct from 'array' and jsonb_array_length(payload -> 'questionGeneration') = 6),
  constraint narrative_generation_exists check (jsonb_typeof(payload -> 'narrativeGeneration') is not distinct from 'object')
);

alter table public.experiment_results enable row level security;
revoke all on table public.experiment_results from public, anon, authenticated, service_role;
grant select, insert on table public.experiment_results to service_role;
-- No anonymous/authenticated policies: reads and inserts go through the server.
-- Updates/deletes are intentionally not part of this completed-result store.
comment on table public.experiment_results is 'Completed research results, schema v2. Includes explicitly labelled synthetic checks.';

notify pgrst, 'reload schema';
commit;
