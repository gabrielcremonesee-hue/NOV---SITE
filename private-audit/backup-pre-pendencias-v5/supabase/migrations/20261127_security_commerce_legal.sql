-- FerveC Gastronomia — Segurança, Sessão Única, Cupons Atômicos, 18+, Aceite Legal e Arrependimento Art. 49 CDC (Idempotente)

create extension if not exists pgcrypto;

-- 1) Perfis: idade mínima 18 anos (NOT VALID preserva eventuais registros legados, valida novos/alterados) e rastreio de aceite
alter table if exists public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text;

do $$
begin
  if to_regclass('public.profiles') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'profiles_age_minimum_18'
         and conrelid = 'public.profiles'::regclass
     ) then
    alter table public.profiles
      add constraint profiles_age_minimum_18
      check (age is null or age >= 18) not valid;
  end if;
end $$;

-- 2) Pedidos: metadados de cupom, versão legal e ambiente
alter table if exists public.orders
  add column if not exists subtotal_cents integer,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists coupon_code text,
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists legal_accepted_at timestamptz,
  add column if not exists environment text not null default 'sandbox';

create index if not exists idx_orders_user_course_status
  on public.orders (user_id, course_id, status, created_at desc);

-- 3) Sessão Única Ativa (apenas 1 sessão simultânea por usuário)
create table if not exists public.user_active_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id text not null,
  device_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_active_sessions enable row level security;

drop policy if exists "user_active_sessions_select_own" on public.user_active_sessions;
create policy "user_active_sessions_select_own"
  on public.user_active_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on table public.user_active_sessions from anon, authenticated;
grant all on table public.user_active_sessions to service_role;

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
  if v_uid is null or length(v_clean) < 8 then
    raise exception 'Sessão inválida para vínculo.';
  end if;

  insert into public.user_active_sessions (user_id, session_id, device_hint, created_at, updated_at)
  values (v_uid, v_clean, left(coalesce(p_device_hint, ''), 120), now(), now())
  on conflict (user_id) do update
    set session_id = excluded.session_id,
        device_hint = excluded.device_hint,
        updated_at = now();

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
begin
  if v_uid is null then
    return false;
  end if;

  if p_session_id is null or length(trim(p_session_id)) = 0 then
    delete from public.user_active_sessions where user_id = v_uid;
  else
    delete from public.user_active_sessions where user_id = v_uid and session_id = trim(p_session_id);
  end if;

  return true;
end;
$$;

-- 4) Cupons Promocionais e Resgates Atômicos
create table if not exists public.coupons (
  code text primary key,
  discount_percent integer not null check (discount_percent >= 1 and discount_percent <= 100),
  course_scope text not null default 'massas-italianas',
  max_uses integer not null default 1 check (max_uses >= 1),
  uses_count integer not null default 0 check (uses_count >= 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_code text not null references public.coupons (code) on delete restrict,
  order_id uuid references public.orders (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  course_slug text not null,
  original_cents integer not null check (original_cents >= 0),
  discount_cents integer not null check (discount_cents >= 0),
  final_cents integer not null check (final_cents >= 0),
  redeemed_at timestamptz not null default now(),
  unique (coupon_code, user_id, course_slug)
);

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

revoke all on table public.coupons from anon, authenticated;
grant all on table public.coupons to service_role;

drop policy if exists "coupon_redemptions_select_own" on public.coupon_redemptions;
create policy "coupon_redemptions_select_own"
  on public.coupon_redemptions
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on table public.coupon_redemptions from anon, authenticated;
grant all on table public.coupon_redemptions to service_role;

create or replace function public.redeem_coupon_atomic(
  p_code text,
  p_user_id uuid,
  p_course_slug text,
  p_order_id uuid,
  p_original_cents integer
)
returns table (
  ok boolean,
  error_code text,
  discount_percent integer,
  discount_cents integer,
  final_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_clean_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_discount_cents integer;
  v_final_cents integer;
begin
  if p_user_id is null or length(v_clean_code) = 0 then
    return query select false, 'INVALID_INPUT', 0, 0, p_original_cents;
    return;
  end if;

  if exists (
    select 1 from public.coupon_redemptions
    where coupon_code = v_clean_code
      and user_id = p_user_id
      and course_slug = p_course_slug
  ) then
    return query select false, 'ALREADY_REDEEMED_BY_USER', 0, 0, p_original_cents;
    return;
  end if;

  update public.coupons
     set uses_count = uses_count + 1
   where code = v_clean_code
     and active = true
     and (expires_at is null or expires_at > now())
     and uses_count < max_uses
     and (course_scope = 'all' or course_scope = p_course_slug)
  returning * into v_coupon;

  if not found then
    return query select false, 'COUPON_UNAVAILABLE', 0, 0, p_original_cents;
    return;
  end if;

  v_discount_cents := round((p_original_cents * v_coupon.discount_percent) / 100.0)::integer;
  v_final_cents := greatest(0, p_original_cents - v_discount_cents);

  insert into public.coupon_redemptions (
    coupon_code, order_id, user_id, course_slug, original_cents, discount_cents, final_cents
  ) values (
    v_coupon.code, p_order_id, p_user_id, p_course_slug, p_original_cents, v_discount_cents, v_final_cents
  );

  return query select true, null::text, v_coupon.discount_percent, v_discount_cents, v_final_cents;
end;
$$;

-- 5) Registro Versionado de Aceite Legal (Append-only)
create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  course_slug text,
  acceptance_kind text not null check (acceptance_kind in ('signup', 'checkout')),
  terms_version text not null,
  privacy_version text not null,
  marketing_whatsapp boolean not null default false,
  marketing_email boolean not null default false,
  user_agent text,
  accepted_at timestamptz not null default now()
);

create index if not exists idx_legal_acceptances_user_id
  on public.legal_acceptances (user_id, accepted_at desc);

alter table public.legal_acceptances enable row level security;

drop policy if exists "legal_acceptances_select_own" on public.legal_acceptances;
create policy "legal_acceptances_select_own"
  on public.legal_acceptances
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "legal_acceptances_insert_own" on public.legal_acceptances;
create policy "legal_acceptances_insert_own"
  on public.legal_acceptances
  for insert
  to authenticated
  with check (auth.uid() = user_id);

revoke update, delete on table public.legal_acceptances from anon, authenticated;
grant all on table public.legal_acceptances to service_role;

-- 6) Direito de Arrependimento (Art. 49 CDC / Decreto 7.962/2013 - 7 dias)
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  reason text,
  status text not null default 'requested'
    check (status in ('requested', 'approved_refund_pending', 'refunded', 'rejected_out_of_window')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  admin_note text
);

create index if not exists idx_withdrawal_requests_user_id
  on public.withdrawal_requests (user_id, requested_at desc);

alter table public.withdrawal_requests enable row level security;

drop policy if exists "withdrawal_requests_select_own" on public.withdrawal_requests;
create policy "withdrawal_requests_select_own"
  on public.withdrawal_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "withdrawal_requests_insert_own" on public.withdrawal_requests;
create policy "withdrawal_requests_insert_own"
  on public.withdrawal_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

revoke update, delete on table public.withdrawal_requests from anon, authenticated;
grant all on table public.withdrawal_requests to service_role;
