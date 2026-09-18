create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  description text,
  category text default 'Travel & Transport',
  cta_text text default 'Book with Giants Travel',
  cta_url text not null,
  image_url text,
  logo_url text,
  phone text,
  placement text not null default 'all', -- 'in_feed', 'post_report', 'banner', 'all'
  city text default 'all', -- 'all', 'Lilongwe', 'Blantyre', etc.
  badge text default 'Official Partner',
  is_active boolean not null default true,
  impressions integer not null default 0,
  clicks integer not null default 0,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sponsors enable row level security;

create policy "Public can view active sponsors"
  on public.sponsors
  for select
  to anon, authenticated
  using (is_active = true and (ends_at is null or ends_at > now()));

-- Seed The Giants Travel as our primary sponsor
insert into public.sponsors (
  name,
  tagline,
  description,
  category,
  cta_text,
  cta_url,
  phone,
  placement,
  city,
  badge,
  is_active
) values (
  'The Giants Travel',
  'Awaken to a New World. Reliable flights, car rentals & airport transfers across Malawi.',
  'Planning road trips, airport transfers, or global flights? Travel with Malawian locals who know the territory.',
  'Travel & Transfers',
  'Explore Giants Travel',
  'https://giantstravel.com',
  '+265999000000',
  'all',
  'all',
  'Featured Partner',
  true
) on conflict do nothing;
