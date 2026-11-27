-- FerveC Gastronomia — Automação de Certificados e Storage (Idempotente)
-- Execute no SQL Editor do projeto Supabase caso ainda não tenha configurado
-- a coluna opcional de minutos estimados, o índice único de anti-duplicidade
-- ou o bucket privado de armazenamento de PDFs.

-- 1) Suporte opcional à coluna numérica de carga horária em minutos nos cursos e módulos
alter table if exists public.courses
  add column if not exists estimated_minutes integer;

alter table if exists public.course_modules
  add column if not exists estimated_minutes integer;

-- 2) Garantia de unicidade no banco: no máximo 1 certificado por aluno e curso
create unique index if not exists certificates_user_course_uidx
  on public.certificates (user_id, course_id);

-- 3) Garantir RLS habilitada em certificates e políticas por usuário autenticado
alter table if exists public.certificates enable row level security;

drop policy if exists "certificates_select_own" on public.certificates;
create policy "certificates_select_own"
  on public.certificates
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "certificates_insert_own" on public.certificates;
create policy "certificates_insert_own"
  on public.certificates
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 4) Bucket privado "certificates" no Supabase Storage para armazenar PDFs emitidos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificates',
  'certificates',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf'];

-- 5) Políticas do Storage: cada aluno autenticado só lê/grava arquivos na própria pasta (<auth.uid()>/<codigo>.pdf)
drop policy if exists "certificates_storage_select_own" on storage.objects;
create policy "certificates_storage_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "certificates_storage_insert_own" on storage.objects;
create policy "certificates_storage_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "certificates_storage_update_own" on storage.objects;
create policy "certificates_storage_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
