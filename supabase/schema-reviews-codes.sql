-- Traveller reviews: submitted from the site through the "admin" edge function, published after the owner approves them in /admin
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  country text,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  tour text,
  lang text,
  approved boolean not null default false,
  ip_hash text
);
alter table public.reviews enable row level security;
revoke all on table public.reviews from anon, authenticated;
grant select (id, created_at, name, country, rating, body, tour, lang) on public.reviews to anon, authenticated;
drop policy if exists reviews_public_approved on public.reviews;
create policy reviews_public_approved on public.reviews for select to anon, authenticated using (approved);
grant select, insert, update, delete on table public.reviews to service_role;
create index if not exists reviews_approved_time on public.reviews (approved, created_at desc);

-- One-time login codes e-mailed to the owners for /admin
create table if not exists public.admin_codes (
  id bigint generated always as identity primary key,
  email text not null,
  code_hash text not null,
  tries smallint not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.admin_codes enable row level security;
revoke all on table public.admin_codes from anon, authenticated;
grant select, insert, update, delete on table public.admin_codes to service_role;
grant usage, select on all sequences in schema public to service_role;
create index if not exists admin_codes_email_time on public.admin_codes (email, created_at desc);
