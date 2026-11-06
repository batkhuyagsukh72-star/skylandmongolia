-- Site content edited from /admin (written only by the "admin" edge function with the service role; read publicly by the site)
create table if not exists public.content (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.content_history (
  id bigint generated always as identity primary key,
  key text not null,
  data jsonb not null,
  note text,
  saved_at timestamptz not null default now()
);
create table if not exists public.admin_login (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
alter table public.content enable row level security;
alter table public.content_history enable row level security;
alter table public.admin_login enable row level security;
revoke all on table public.content, public.content_history, public.admin_login from anon, authenticated;
grant select on table public.content to anon, authenticated;
drop policy if exists content_public_read on public.content;
create policy content_public_read on public.content for select to anon, authenticated using (true);
grant select, insert, update on table public.content, public.content_history, public.admin_login to service_role;
grant usage, select on all sequences in schema public to service_role;
create index if not exists admin_login_ip_time on public.admin_login (ip_hash, at desc);

-- Public photo bucket for tour photos uploaded from /admin (uploads go through the edge function only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tour-photos', 'tour-photos', true, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;
