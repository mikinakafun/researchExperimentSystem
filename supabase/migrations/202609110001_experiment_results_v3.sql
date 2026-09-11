-- Additive migration. Preserves every existing v2 row and permits the v3
-- two-condition contract in the same table.
begin;

alter table public.experiment_results drop constraint condition_check;
alter table public.experiment_results drop constraint schema_version_check;
alter table public.experiment_results
  add constraint experiment_results_condition_by_schema check (
    (schema_version = '2' and condition in ('standard', 'visual', 'odor')) or
    (schema_version = '3' and condition in ('visual', 'odor'))
  ),
  add constraint experiment_results_schema_version check (schema_version in ('2', '3'));

comment on table public.experiment_results is 'Completed research results. Legacy schema v2 rows are retained; schema v3 is the two-condition contract.';
notify pgrst, 'reload schema';
commit;
