create table if not exists public.pwa_installs (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'unknown',
  user_agent text,
  device_id text,
  installed_at timestamptz not null default now()
);

alter table public.pwa_installs enable row level security;

-- Allow anonymous inserts from web clients
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'pwa_installs' and policyname = 'Allow anonymous insert pwa_installs'
  ) then
    create policy "Allow anonymous insert pwa_installs"
      on public.pwa_installs
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'pwa_installs' and policyname = 'Allow read pwa_installs'
  ) then
    create policy "Allow read pwa_installs"
      on public.pwa_installs
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;
