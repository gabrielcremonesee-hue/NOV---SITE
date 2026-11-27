-- FerveC Gastronomia — Estrutura de Pagamentos Asaas Sandbox (Idempotente)
-- Execute este script no SQL Editor do Supabase ANTES (ou junto) de 20261116_webhook_logs.sql.
-- Cobre as dependências das Edge Functions `create-asaas-charge` e `asaas-webhook`:
--   1. public.orders
--   2. public.payments
--   3. public.asaas_webhook_events
--   4. Colunas opcionais em public.courses e public.profiles

create extension if not exists pgcrypto;

-- 1) Colunas auxiliares nas tabelas existentes
alter table if exists public.courses
  add column if not exists price_cents integer default 1290;

update public.courses
   set price_cents = 1290
 where slug = 'massas-italianas'
   and (price_cents is null or price_cents <= 0);

alter table if exists public.profiles
  add column if not exists asaas_customer_id text;

-- 2) Tabela de pedidos (orders)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'overdue', 'canceled', 'refunded')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  asaas_payment_id text,
  asaas_customer_id text,
  external_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id
  on public.orders (user_id, created_at desc);

create index if not exists idx_orders_course_id
  on public.orders (course_id);

create unique index if not exists idx_orders_asaas_payment_id_uidx
  on public.orders (asaas_payment_id)
  where asaas_payment_id is not null;

alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on table public.orders from anon, authenticated;
grant all on table public.orders to service_role;

-- 3) Tabela de cobranças/pagamentos individuais (payments)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  asaas_payment_id text not null unique,
  status text not null default 'PENDING',
  billing_type text,
  value_cents integer,
  due_date date,
  invoice_url text,
  bank_slip_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_order_id
  on public.payments (order_id);

create index if not exists idx_payments_user_id
  on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on table public.payments from anon, authenticated;
grant all on table public.payments to service_role;

-- 4) Tabela de idempotência dos eventos já processados pelo webhook
create table if not exists public.asaas_webhook_events (
  event_id text primary key,
  event_type text not null,
  asaas_payment_id text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists idx_asaas_webhook_events_payment_id
  on public.asaas_webhook_events (asaas_payment_id)
  where asaas_payment_id is not null;

alter table public.asaas_webhook_events enable row level security;

revoke all on table public.asaas_webhook_events from anon, authenticated;
grant all on table public.asaas_webhook_events to service_role;
