-- Subscription endpoints and keys are capabilities: only the server may access them.
create table public.fuel_push_subscriptions (
  endpoint_hash text primary key check (length(endpoint_hash) = 64),
  owner_hash text not null check (length(owner_hash) = 64),
  subscription jsonb not null,
  station_ids text[] not null default '{}' check (cardinality(station_ids) <= 50),
  last_status jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  lease_until timestamptz not null default '-infinity'
);
create index fuel_push_owner_idx on public.fuel_push_subscriptions(owner_hash);
create index fuel_push_checked_idx on public.fuel_push_subscriptions(last_checked_at);
alter table public.fuel_push_subscriptions enable row level security;
revoke all on public.fuel_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.fuel_push_subscriptions to service_role;
