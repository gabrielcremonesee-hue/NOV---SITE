-- FerveC Gastronomia — Migration V5: Prontidão de Produção, Preço Oficial R$ 12,90, Colunas Ausentes, Sessão Única com Expiração e Estorno Seguro (Idempotente)
-- Preserva 100% dos dados existentes; segura para execução repetida (re-runnable).

create extension if not exists pgcrypto;

-- 1) Cursos e módulos: garantir colunas de preço e carga horária + corrigir divergência histórica R$ 12,00 -> R$ 12,90
alter table if exists public.courses
  add column if not exists price_cents integer default 1290,
  add column if not exists estimated_minutes integer,
  add column if not exists workload_minutes integer;

alter table if exists public.course_modules
  add column if not exists estimated_minutes integer,
  add column if not exists duration_minutes integer;

update public.courses
   set price_cents = 1290
 where slug = 'massas-italianas'
   and price_cents is distinct from 1290;

-- 2) Perfis: garantir colunas cadastrais, LGPD, Asaas e aceite versionado
alter table if exists public.profiles
  add column if not exists cpf_hash text,
  add column if not exists birth_date text,
  add column if not exists age integer,
  add column if not exists ddd text,
  add column if not exists phone text,
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists email_opt_in boolean not null default false,
  add column if not exists asaas_customer_id text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists updated_at timestamptz not null default now();

-- 3) Pedidos: garantir colunas comerciais, jurídicas, idempotência e status de arrependimento
alter table if exists public.orders
  add column if not exists subtotal_cents integer,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists coupon_code text,
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists legal_accepted_at timestamptz,
  add column if not exists environment text not null default 'sandbox',
  add column if not exists idempotency_key text,
  add column if not exists external_reference text,
  add column if not exists asaas_payment_id text,
  add column if not exists asaas_customer_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_orders_user_course_status
  on public.orders (user_id, course_id, status, created_at desc);

create unique index if not exists idx_orders_user_course_idempotency
  on public.orders (user_id, course_id, idempotency_key)
  where idempotency_key is not null;

do $$
declare
  v_conname text;
begin
  if to_regclass('public.orders') is not null then
    for v_conname in
      select conname
      from pg_constraint
      where conrelid = 'public.orders'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%status%'
    loop
      execute format('alter table public.orders drop constraint %I', v_conname);
    end loop;

    alter table public.orders
      add constraint orders_status_check
      check (status in ('pending', 'paid', 'overdue', 'canceled', 'refund_requested', 'refunded'));
  end if;
end $$;

-- 4) Arrependimento (Art. 49 CDC): protocolo único e status 'refund_failed' para falha de estorno no gateway
alter table if exists public.withdrawal_requests
  add column if not exists protocol_code text,
  add column if not exists refund_provider_id text,
  add column if not exists refund_provider_status text;

create unique index if not exists idx_withdrawal_requests_protocol_code
  on public.withdrawal_requests (protocol_code)
  where protocol_code is not null;

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
      check (status in ('requested', 'approved_refund_pending', 'refunded', 'refund_failed', 'rejected_out_of_window'));
  end if;
end $$;

-- 5) Sessão Única Ativa: expiração automática (7 dias) + last_seen_at + verificação
alter table if exists public.user_active_sessions
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

create or replace function public.claim_active_session(p_session_id text, p_device_hint text default null)
returns table (user_id uuid, session_id text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean text := trim(coalesce(p_session_id, ''));
  v_now timestamptz := now();
  v_exp timestamptz := v_now + interval '7 days';
begin
  if v_uid is null or length(v_clean) < 8 then
    raise exception 'Sessão inválida para vínculo.';
  end if;

  insert into public.user_active_sessions (
    user_id, session_id, device_hint, created_at, updated_at, last_seen_at, expires_at
  )
  values (
    v_uid, v_clean, left(coalesce(p_device_hint, ''), 120), v_now, v_now, v_now, v_exp
  )
  on conflict (user_id) do update
    set session_id = excluded.session_id,
        device_hint = excluded.device_hint,
        updated_at = v_now,
        last_seen_at = v_now,
        expires_at = v_exp;

  return query
    select s.user_id, s.session_id, s.updated_at
    from public.user_active_sessions s
    where s.user_id = v_uid;
end;
$$;

create or replace function public.verify_active_session(p_session_id text)
returns table (valid boolean, reason text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean text := trim(coalesce(p_session_id, ''));
  v_row public.user_active_sessions%rowtype;
begin
  if v_uid is null or length(v_clean) < 8 then
    return query select false, 'SESSION_REQUIRED'::text, null::timestamptz;
    return;
  end if;

  select * into v_row
  from public.user_active_sessions s
  where s.user_id = v_uid;

  if not found then
    return query select false, 'SESSION_NOT_CLAIMED'::text, null::timestamptz;
    return;
  end if;

  if v_row.session_id <> v_clean then
    return query select false, 'SESSION_REPLACED_OTHER_DEVICE'::text, v_row.expires_at;
    return;
  end if;

  if v_row.expires_at is not null and v_row.expires_at <= now() then
    return query select false, 'SESSION_EXPIRED'::text, v_row.expires_at;
    return;
  end if;

  update public.user_active_sessions
     set last_seen_at = now()
   where user_id = v_uid
     and session_id = v_clean;

  return query select true, 'OK'::text, v_row.expires_at;
end;
$$;

-- 6) Permissões explícitas para service_role (backend/Edge Functions sem exposição a anon/authenticated)
do $$
declare
  t text;
begin
  foreach t in array array[
    'orders',
    'payments',
    'asaas_webhook_events',
    'webhook_logs',
    'coupons',
    'coupon_redemptions',
    'legal_acceptances',
    'withdrawal_requests',
    'user_active_sessions'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('grant all on table public.%I to service_role', t);
    end if;
  end loop;
end $$;
