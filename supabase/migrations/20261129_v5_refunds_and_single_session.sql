-- FerveC Gastronomia — Migration Aditiva V5: Estados de Estorno/Falha e Sessão Única com Expiração Atômica
-- OBS: Preparada para revisão e aplicação controlada no Supabase remoto. Não aplicada automaticamente.

-- 1) Ampliar withdrawal_requests para diferenciar solicitação recebida, processamento, falha de estorno e confirmação definitiva
alter table if exists public.withdrawal_requests
  add column if not exists refund_attempts integer not null default 0,
  add column if not exists last_refund_error text;

do $$
declare
  v_conname text;
begin
  if to_regclass('public.withdrawal_requests') is not null then
    for v_conname in
      select conname
      from pg_constraint
      where conrelid = 'public.withdrawal_requests'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%status%'
    loop
      execute format('alter table public.withdrawal_requests drop constraint %I', v_conname);
    end loop;

    alter table public.withdrawal_requests
      add constraint withdrawal_requests_status_check
      check (
        status in (
          'requested',
          'approved_refund_pending',
          'refund_failed',
          'refunded',
          'rejected_out_of_window'
        )
      );
  end if;
end $$;

-- 2) Sessão única ativa com expiração explícita e vínculo atômico por usuário autenticado
alter table if exists public.user_active_sessions
  add column if not exists expires_at timestamptz not null default (now() + interval '12 hours');

create index if not exists idx_user_active_sessions_expires_at
  on public.user_active_sessions (expires_at);

create or replace function public.claim_active_session(p_session_id text, p_device_hint text default null)
returns table (user_id uuid, session_id text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean text := trim(coalesce(p_session_id, ''));
begin
  if v_uid is null or length(v_clean) < 16 then
    raise exception 'Sessão inválida para vínculo.';
  end if;

  insert into public.user_active_sessions (user_id, session_id, device_hint, created_at, updated_at, expires_at)
  values (v_uid, v_clean, left(coalesce(p_device_hint, ''), 120), now(), now(), now() + interval '12 hours')
  on conflict (user_id) do update
    set session_id = excluded.session_id,
        device_hint = excluded.device_hint,
        updated_at = now(),
        expires_at = now() + interval '12 hours';

  return query
    select s.user_id, s.session_id, s.updated_at
    from public.user_active_sessions s
    where s.user_id = v_uid;
end;
$$;

create or replace function public.clear_active_session(p_session_id text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean text := trim(coalesce(p_session_id, ''));
begin
  if v_uid is null or length(v_clean) < 16 then
    return false;
  end if;

  -- Somente a sessão atualmente ativa pode encerrar a si mesma; logout de sessão antiga nunca derruba sessão nova.
  delete from public.user_active_sessions
   where user_id = v_uid
     and session_id = v_clean;

  return found;
end;
$$;

create or replace function public.verify_active_session(p_session_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_active_sessions s
    where s.user_id = auth.uid()
      and s.session_id = trim(coalesce(p_session_id, ''))
      and s.expires_at > now()
  );
$$;

revoke all on function public.claim_active_session(text, text) from public;
grant execute on function public.claim_active_session(text, text) to authenticated, service_role;

revoke all on function public.clear_active_session(text) from public;
grant execute on function public.clear_active_session(text) to authenticated, service_role;

revoke all on function public.verify_active_session(text) from public;
grant execute on function public.verify_active_session(text) to authenticated, service_role;
