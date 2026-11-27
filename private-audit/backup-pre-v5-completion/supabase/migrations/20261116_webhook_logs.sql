-- FerveC Gastronomia — Tabela de auditoria e depuração de webhooks do Asaas
-- Pronta para execução direta no SQL Editor do Supabase (idempotente).
-- Recomendação: execute após (ou em conjunto com) 20261116_asaas_payments_schema.sql.

create extension if not exists pgcrypto;

create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'asaas',
  environment text not null default 'sandbox',
  event_id text,
  event_type text,
  asaas_payment_id text,
  external_reference text,
  order_id uuid,
  processing_status text not null default 'received'
    check (
      processing_status in (
        'received',
        'processed',
        'duplicate',
        'unauthorized',
        'invalid_payload',
        'not_found',
        'failed'
      )
    ),
  http_status integer,
  token_valid boolean not null default false,
  error_message text,
  request_headers jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_webhook_logs_event_id
  on public.webhook_logs (event_id)
  where event_id is not null;

create index if not exists idx_webhook_logs_asaas_payment_id
  on public.webhook_logs (asaas_payment_id)
  where asaas_payment_id is not null;

create index if not exists idx_webhook_logs_status_received
  on public.webhook_logs (processing_status, received_at desc);

create index if not exists idx_webhook_logs_order_id
  on public.webhook_logs (order_id)
  where order_id is not null;

create index if not exists idx_webhook_logs_received_at_desc
  on public.webhook_logs (received_at desc);

-- Vincula order_id à tabela public.orders apenas se public.orders já existir
do $$
begin
  if to_regclass('public.orders') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'fk_webhook_logs_order_id'
         and conrelid = 'public.webhook_logs'::regclass
     ) then
    alter table public.webhook_logs
      add constraint fk_webhook_logs_order_id
      foreign key (order_id)
      references public.orders (id)
      on delete set null;
  end if;
end
$$;

-- Segurança: RLS habilitada sem políticas públicas para anon/authenticated.
-- Apenas Edge Functions/backend utilizando service_role acessam webhook_logs.
alter table public.webhook_logs enable row level security;

revoke all on table public.webhook_logs from anon, authenticated;
grant all on table public.webhook_logs to service_role;
