-- FerveC Gastronomia — Ciclo de Vida Completo de Estornos e Sessão Única Blindada (Idempotente)

-- 1) Sessão única ativa: expiração explícita e RPCs atômicas seguras
alter table if exists public.user_active_sessions
  add column if not exists expires_at timestamptz not null default (now() + interval '12 hours');

create or replace function public.claim_active_session(
  p_session_id text,
  p_device_hint text default null,
  p_expires_at timestamptz default (now() + interval '12 hours')
)
returns table (user_id uuid, session_id text, updated_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean text := trim(coalesce(p_session_id, ''));
  v_exp timestamptz := greatest(coalesce(p_expires_at, now() + interval '12 hours'), now() + interval '1 minute');
begin
  if v_uid is null or length(v_clean) < 8 then
    raise exception 'Sessão inválida para vínculo.';
  end if;

  insert into public.user_active_sessions (user_id, session_id, device_hint, created_at, updated_at, expires_at)
  values (v_uid, v_clean, left(coalesce(p_device_hint, ''), 120), now(), now(), v_exp)
  on conflict (user_id) do update
    set session_id = excluded.session_id,
        device_hint = excluded.device_hint,
        updated_at = now(),
        expires_at = excluded.expires_at;

  return query
    select s.user_id, s.session_id, s.updated_at, s.expires_at
    from public.user_active_sessions s
    where s.user_id = v_uid;
end;
$$;

-- Segurança crítica: o logout de uma sessão antiga só pode encerrar se p_session_id corresponder exatamente à sessão ativa.
-- Sem p_session_id válido (>= 8 chars), nenhuma sessão é removida.
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
  if v_uid is null or length(v_clean) < 8 then
    return false;
  end if;

  delete from public.user_active_sessions
   where user_id = v_uid
     and session_id = v_clean;

  return found;
end;
$$;

-- 2) Ciclo de vida completo de estornos e direito de arrependimento (Art. 49 CDC)
alter table if exists public.withdrawal_requests
  add column if not exists refund_failure_reason text,
  add column if not exists refund_confirmed_at timestamptz,
  add column if not exists refund_notified_at timestamptz,
  add column if not exists refund_last_event text,
  add column if not exists updated_at timestamptz not null default now();

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
          'refund_processing',
          'refund_failed',
          'refunded',
          'rejected_out_of_window'
        )
      );
  end if;
end $$;
