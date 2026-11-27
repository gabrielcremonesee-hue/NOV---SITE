-- Additive idempotent schema upgrade for assessment bank versioning & historical attempt snapshots
-- Safe for existing rows: legacy attempts keep their recorded answers, score, and passed intact.

alter table if exists public.assessment_attempts
  add column if not exists bank_version text,
  add column if not exists question_ids jsonb,
  add column if not exists selected_option_ids jsonb,
  add column if not exists question_snapshots jsonb;
