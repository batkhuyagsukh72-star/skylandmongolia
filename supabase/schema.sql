-- Trip requests from skylandmongolia.com (written only by the "contact" edge function with the service role)
create table if not exists public.requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  contact text not null,
  email text,
  month text,
  travellers text,
  style text,
  tour text,
  places text,
  note text,
  lang text,
  ip_hash text,
  mailed boolean not null default false,
  mail_error text
);
alter table public.requests enable row level security;
revoke all on table public.requests from anon, authenticated;
grant select, insert, update on table public.requests to service_role;
grant usage, select on all sequences in schema public to service_role;
create index if not exists requests_ip_time on public.requests (ip_hash, created_at desc);
