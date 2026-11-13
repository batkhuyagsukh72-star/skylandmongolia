-- v3: review photos, admin settings (password that can be seen and changed in /admin), videos in the photo bucket
alter table public.reviews add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.reviews add column if not exists avatar text;
grant select (photos, avatar) on public.reviews to anon, authenticated;

create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_settings enable row level security;
revoke all on table public.admin_settings from anon, authenticated;
grant select, insert, update, delete on table public.admin_settings to service_role;

update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png', 'video/mp4', 'video/webm', 'video/quicktime']
 where id = 'tour-photos';

-- the four reviews from the old website move into the table, so the owner can edit or hide them in /admin like any other
alter table public.reviews alter column rating type numeric(2,1);
insert into public.reviews (name, country, rating, body, approved, lang)
select * from (values
  ('John Cummins', 'UK', 5.0, 'An unforgettable five-day journey through the Gobi Desert. Our guide’s deep knowledge of Mongolian culture and landscapes made every moment meaningful and seamless.', true, 'old-site'),
  ('Veronica Jean', 'USA', 5.0, 'Professional, responsive, and deeply connected to Mongolia. Everything was thoughtfully arranged, making the journey both smooth and memorable.', true, 'old-site'),
  ('Zoe', null, 5.0, 'An authentic and enriching Gobi tour from start to finish. Highly recommended for anyone seeking a real Mongolian experience.', true, 'old-site'),
  ('Gianluca', 'Italy', 4.5, 'It was incredible to spend days in these places.', true, 'old-site')
) as v(name, country, rating, body, approved, lang)
where not exists (select 1 from public.reviews where lang = 'old-site');
