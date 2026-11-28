-- FerveC Gastronomia — Etapa A: Auditoria de Segurança, RLS, Integridade e Hardening (Idempotente)
-- NÃO destrói tabelas nem apaga registros legítimos de alunos, matrículas, pedidos, provas ou certificados.

-- 1) Certificados oficiais (public.certificates): somente leitura pelo próprio aluno;
--    emissão/alteração exclusivamente pelo backend autorizado (service_role).
alter table if exists public.certificates enable row level security;

drop policy if exists "certificates_insert_own" on public.certificates;
drop policy if exists "certificates_update_own" on public.certificates;
drop policy if exists "certificates_delete_own" on public.certificates;

revoke all on table public.certificates from anon;
revoke insert, update, delete on table public.certificates from authenticated;
grant select on table public.certificates to authenticated;
grant all on table public.certificates to service_role;

do $$
begin
  if to_regclass('public.certificates') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'chk_certificates_status_valid'
         and conrelid = 'public.certificates'::regclass
     ) then
    alter table public.certificates
      add constraint chk_certificates_status_valid
      check (status in ('issued', 'revoked')) not valid;
  end if;
end $$;

-- 2) Tentativas de avaliação (public.assessment_attempts): somente leitura pelo aluno;
--    correção e gravação exclusivamente pelo servidor (/api/assessments/submit via service_role).
alter table if exists public.assessment_attempts enable row level security;

drop policy if exists "assessment_attempts_insert_own" on public.assessment_attempts;
drop policy if exists "assessment_attempts_update_own" on public.assessment_attempts;
drop policy if exists "assessment_attempts_delete_own" on public.assessment_attempts;

revoke all on table public.assessment_attempts from anon;
revoke insert, update, delete on table public.assessment_attempts from authenticated;
grant select on table public.assessment_attempts to authenticated;
grant all on table public.assessment_attempts to service_role;

do $$
begin
  if to_regclass('public.assessment_attempts') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'chk_assessment_attempts_score_range'
         and conrelid = 'public.assessment_attempts'::regclass
     ) then
    alter table public.assessment_attempts
      add constraint chk_assessment_attempts_score_range
      check (score >= 0 and score <= 100) not valid;
  end if;
end $$;

-- 3) Progresso por módulo (public.module_progress): somente leitura direta pelo aluno via PostgREST;
--    atualizações ocorrem exclusivamente pelas rotas validadas do servidor (/api/progress/sync e /api/assessments/submit)
--    evitando adulteração direta de exam_status/work_finished/lesson_finished no REST.
alter table if exists public.module_progress enable row level security;

drop policy if exists "module_progress_insert_own" on public.module_progress;
drop policy if exists "module_progress_update_own" on public.module_progress;
drop policy if exists "module_progress_delete_own" on public.module_progress;

revoke all on table public.module_progress from anon;
revoke insert, update, delete on table public.module_progress from authenticated;
grant select on table public.module_progress to authenticated;
grant all on table public.module_progress to service_role;

-- 4) Solicitações de arrependimento / estorno CDC Art. 49 (public.withdrawal_requests):
--    leitura pelo próprio aluno; criação e transição de status apenas pelo backend autorizado (service_role).
alter table if exists public.withdrawal_requests enable row level security;

drop policy if exists "withdrawal_requests_insert_own" on public.withdrawal_requests;
drop policy if exists "withdrawal_requests_update_own" on public.withdrawal_requests;
drop policy if exists "withdrawal_requests_delete_own" on public.withdrawal_requests;

revoke all on table public.withdrawal_requests from anon;
revoke insert, update, delete on table public.withdrawal_requests from authenticated;
grant select on table public.withdrawal_requests to authenticated;
grant all on table public.withdrawal_requests to service_role;

-- 5) Storage bucket 'certificates': impedir upload/sobrescrita direta pelo cliente autenticado.
--    Somente leitura pelo dono (pasta própria) e upload exclusivamente via service_role.
do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "certificates_storage_insert_own" on storage.objects;
    drop policy if exists "certificates_storage_update_own" on storage.objects;
    drop policy if exists "certificates_storage_delete_own" on storage.objects;
  end if;
end $$;

-- 6) Restringir execução de RPCs SECURITY DEFINER sensíveis
do $$
begin
  if to_regprocedure('public.redeem_coupon_atomic(text, uuid, text, uuid, integer)') is not null then
    revoke all on function public.redeem_coupon_atomic(text, uuid, text, uuid, integer) from public, anon, authenticated;
    grant execute on function public.redeem_coupon_atomic(text, uuid, text, uuid, integer) to service_role;
  end if;

  if to_regprocedure('public.claim_active_session(text, text)') is not null then
    revoke all on function public.claim_active_session(text, text) from public, anon;
    grant execute on function public.claim_active_session(text, text) to authenticated, service_role;
  end if;

  if to_regprocedure('public.clear_active_session(text)') is not null then
    revoke all on function public.clear_active_session(text) from public, anon;
    grant execute on function public.clear_active_session(text) to authenticated, service_role;
  end if;

  if to_regprocedure('public.verify_active_session(text)') is not null then
    revoke all on function public.verify_active_session(text) from public, anon;
    grant execute on function public.verify_active_session(text) to authenticated, service_role;
  end if;
end $$;

-- 7) RPC idempotente de compensação para liberar cupom caso o gateway Asaas retorne falha antes de gerar a cobrança
create or replace function public.release_coupon_redemption(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if p_order_id is null then
    return false;
  end if;

  delete from public.coupon_redemptions
   where order_id = p_order_id
   returning coupon_code into v_code;

  if v_code is null then
    return false;
  end if;

  update public.coupons
     set uses_count = greatest(0, uses_count - 1)
   where upper(code) = upper(v_code);

  return true;
end;
$$;

revoke all on function public.release_coupon_redemption(uuid) from public, anon, authenticated;
grant execute on function public.release_coupon_redemption(uuid) to service_role;

-- 8) Índices complementares de auditoria de pedidos e matrículas
create index if not exists idx_orders_user_status
  on public.orders (user_id, status, created_at desc);

create index if not exists idx_student_enrollments_user_status
  on public.student_enrollments (user_id, course_id, status);
