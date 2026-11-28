-- FerveC Gastronomia — Migration Idempotente: Schema Base, Endereço Completo do Aluno e RLS Estrito
-- Preserva 100% dos dados existentes; segura para execução repetida (re-runnable).
-- Nunca realiza DROP TABLE nem remove registros existentes.

create extension if not exists pgcrypto;

-- 1) Perfis dos alunos (public.profiles) + Endereço Completo
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  cpf_masked text not null default '***.***.***-**',
  cpf_hash text,
  birth_date text,
  age integer,
  email text not null default '',
  ddd text,
  phone text,
  postal_code text,
  street text,
  street_number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  full_address text,
  whatsapp_opt_in boolean not null default false,
  email_opt_in boolean not null default false,
  asaas_customer_id text,
  terms_accepted_at timestamptz,
  terms_version text,
  privacy_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.profiles
  add column if not exists cpf_hash text,
  add column if not exists birth_date text,
  add column if not exists age integer,
  add column if not exists ddd text,
  add column if not exists phone text,
  add column if not exists postal_code text,
  add column if not exists street text,
  add column if not exists street_number text,
  add column if not exists complement text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists full_address text,
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists email_opt_in boolean not null default false,
  add column if not exists asaas_customer_id text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_profiles_email_lower
  on public.profiles (lower(email));

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke all on table public.profiles from anon;
revoke delete on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- 2) Catálogo de Cursos (public.courses)
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  cuisine text not null default 'italiana',
  subtitle text,
  description text,
  chef_name text,
  level text,
  estimated_minutes integer,
  workload_minutes integer,
  price_cents integer default 1290,
  created_at timestamptz not null default now()
);

alter table if exists public.courses
  add column if not exists estimated_minutes integer,
  add column if not exists workload_minutes integer,
  add column if not exists price_cents integer default 1290;

insert into public.courses (slug, title, cuisine, subtitle, description, chef_name, level, estimated_minutes, price_cents)
values (
  'massas-italianas',
  'Massas Italianas',
  'italiana',
  'A arte clássica das massas artesanais e molhos italianos',
  'Curso de 6 módulos com receitas detalhadas, mise en place, técnicas italianas, trabalhos práticos e prova final.',
  'Chef CREMONESE',
  'Iniciante a intermediário',
  240,
  1290
)
on conflict (slug) do nothing;

update public.courses
   set price_cents = 1290
 where slug = 'massas-italianas'
   and price_cents is distinct from 1290;

alter table public.courses enable row level security;

drop policy if exists "courses_select_public" on public.courses;
create policy "courses_select_public"
  on public.courses
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on table public.courses from anon, authenticated;
grant select on table public.courses to anon, authenticated;
grant all on table public.courses to service_role;

-- 3) Módulos dos Cursos (public.course_modules)
create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_key text not null,
  module_order integer not null,
  title text not null,
  recipe_title text not null default '',
  total_steps integer not null default 6,
  duration_label text not null default '30 min',
  level text not null default 'Iniciante',
  estimated_minutes integer,
  duration_minutes integer,
  unique (course_id, module_key)
);

alter table if exists public.course_modules
  add column if not exists estimated_minutes integer,
  add column if not exists duration_minutes integer;

do $$
declare
  v_course_id uuid;
begin
  select id into v_course_id from public.courses where slug = 'massas-italianas' limit 1;
  if v_course_id is not null then
    insert into public.course_modules (course_id, module_key, module_order, title, recipe_title, total_steps, duration_label, level, estimated_minutes)
    values
      (v_course_id, 'carbonara', 1, 'Tipos de Massas', 'Spaghetti alla Carbonara', 6, '25–30 min', 'Iniciante', 30),
      (v_course_id, 'alfredo', 2, 'Massas Frescas', 'Fettuccine Alfredo', 7, '25–35 min', 'Intermediária', 35),
      (v_course_id, 'arrabbiata', 3, 'Massas Recheadas', 'Penne all’Arrabbiata', 8, '30–40 min', 'Fácil', 35),
      (v_course_id, 'pesto', 4, 'Molhos I', 'Pesto alla Genovese', 10, '20–30 min', 'Fácil', 30),
      (v_course_id, 'ragù', 5, 'Molhos II', 'Ragù alla Bolognese', 14, '90–120 min', 'Avançada', 80),
      (v_course_id, 'sauces', 6, 'Especiais', 'Pomodoro e Manteiga & Sálvia', 6, '20–30 min', 'Iniciante', 30)
    on conflict (course_id, module_key) do nothing;
  end if;
end $$;

alter table public.course_modules enable row level security;

drop policy if exists "course_modules_select_public" on public.course_modules;
create policy "course_modules_select_public"
  on public.course_modules
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on table public.course_modules from anon, authenticated;
grant select on table public.course_modules to anon, authenticated;
grant all on table public.course_modules to service_role;

-- 4) Matrículas dos Alunos (public.student_enrollments)
-- Segurança: leitura apenas do próprio aluno; ativação/atualização de status exclusivamente via backend/webhook (service_role).
create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status text not null default 'in_progress',
  last_module_key text,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create unique index if not exists student_enrollments_user_course_uidx
  on public.student_enrollments (user_id, course_id);

alter table public.student_enrollments enable row level security;

drop policy if exists "student_enrollments_select_own" on public.student_enrollments;
create policy "student_enrollments_select_own"
  on public.student_enrollments
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.student_enrollments from anon;
revoke insert, update, delete on table public.student_enrollments from authenticated;
grant select on table public.student_enrollments to authenticated;
grant all on table public.student_enrollments to service_role;

-- 5) Progresso por Módulo (public.module_progress)
create table if not exists public.module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  module_key text not null,
  current_stage integer not null default 1,
  done_steps integer[] not null default '{}',
  mise_checks integer[] not null default '{}',
  review_done boolean not null default false,
  lesson_finished boolean not null default false,
  work_finished boolean not null default false,
  exam_status text not null default 'not_started',
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, module_key)
);

create unique index if not exists module_progress_user_course_module_uidx
  on public.module_progress (user_id, course_id, module_key);

alter table public.module_progress enable row level security;

drop policy if exists "module_progress_select_own" on public.module_progress;
create policy "module_progress_select_own"
  on public.module_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "module_progress_insert_own" on public.module_progress;
create policy "module_progress_insert_own"
  on public.module_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "module_progress_update_own" on public.module_progress;
create policy "module_progress_update_own"
  on public.module_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.module_progress from anon;
revoke delete on table public.module_progress from authenticated;
grant select, insert, update on table public.module_progress to authenticated;
grant all on table public.module_progress to service_role;

-- 6) Tentativas de Avaliações (public.assessment_attempts)
-- Segurança: append-only por usuário autenticado (sem update/delete pelo aluno para preservar integridade da nota).
create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  module_key text not null,
  attempt_type text not null check (attempt_type in ('work', 'exam')),
  score integer not null default 0,
  passed boolean not null default false,
  answers integer[] not null default '{}',
  attempted_at timestamptz not null default now(),
  bank_version text,
  question_ids text[],
  selected_option_ids text[],
  question_snapshots jsonb
);

create index if not exists idx_assessment_attempts_user_course
  on public.assessment_attempts (user_id, course_id, attempted_at desc);

alter table public.assessment_attempts enable row level security;

drop policy if exists "assessment_attempts_select_own" on public.assessment_attempts;
create policy "assessment_attempts_select_own"
  on public.assessment_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "assessment_attempts_insert_own" on public.assessment_attempts;
create policy "assessment_attempts_insert_own"
  on public.assessment_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

revoke all on table public.assessment_attempts from anon;
revoke update, delete on table public.assessment_attempts from authenticated;
grant select, insert on table public.assessment_attempts to authenticated;
grant all on table public.assessment_attempts to service_role;

-- 7) Certificados Emitidos (public.certificates)
-- Segurança: cada aluno lê/insere apenas o próprio registro; consulta pública de autenticidade (/api/certificates/verify/:code)
-- ocorre exclusivamente no backend sem expor CPF, e-mail, endereço ou user_id.
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  certificate_code text not null unique,
  status text not null default 'issued',
  student_name_snapshot text not null,
  course_title_snapshot text not null,
  issued_at timestamptz not null default now()
);

create unique index if not exists certificates_user_course_uidx
  on public.certificates (user_id, course_id);

create unique index if not exists certificates_code_uidx
  on public.certificates (certificate_code);

alter table public.certificates enable row level security;

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

revoke all on table public.certificates from anon;
revoke update, delete on table public.certificates from authenticated;
grant select, insert on table public.certificates to authenticated;
grant all on table public.certificates to service_role;
