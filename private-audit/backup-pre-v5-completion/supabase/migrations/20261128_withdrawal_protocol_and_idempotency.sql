-- FerveC Gastronomia — Migration Aditiva: Protocolo Art. 49 CDC e Idempotência de Pedidos

alter table if exists public.withdrawal_requests
  add column if not exists protocol_code text,
  add column if not exists refund_provider_id text,
  add column if not exists refund_provider_status text;

create unique index if not exists idx_withdrawal_requests_protocol_code
  on public.withdrawal_requests (protocol_code)
  where protocol_code is not null;

alter table if exists public.orders
  add column if not exists idempotency_key text;

create unique index if not exists idx_orders_user_course_idempotency
  on public.orders (user_id, course_id, idempotency_key)
  where idempotency_key is not null;

-- Amplia a constraint orders.status de forma idempotente para incluir 'refund_requested'
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
