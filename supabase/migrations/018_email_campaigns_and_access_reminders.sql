create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('post', 'manual', 'expiry')),
  title text not null,
  subject text not null,
  body text not null,
  post_id uuid references public.posts(id) on delete set null,
  target_scope text not null,
  target_tiers text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete cascade,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  email text not null,
  status text not null check (status in ('sent', 'logged', 'failed', 'skipped')),
  provider text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, email)
);

create table if not exists public.access_expiry_email_settings (
  id boolean primary key default true check (id = true),
  enabled boolean not null default true,
  days_before integer[] not null default array[7, 3, 1],
  subject text not null default 'Скоро закончится доступ в клуб Lumina',
  body text not null default E'Привет, {{name}}!\n\nТвой доступ к закрытому клубу Lumina закончится через {{days_left}} дн.\nДата окончания: {{expires_at}}.\n\nЕсли хочешь продлить доступ, ответь на это письмо или напиши мне удобным способом.\n\nВойти в клуб: {{club_url}}',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.access_expiry_email_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  days_before integer not null,
  delivery_id uuid references public.email_deliveries(id) on delete set null,
  sent_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, expires_at, days_before)
);

alter table public.email_campaigns enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.access_expiry_email_settings enable row level security;
alter table public.access_expiry_email_logs enable row level security;

create policy "Admins manage email campaigns"
on public.email_campaigns
for all
using (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
))
with check (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
));

create policy "Admins manage email deliveries"
on public.email_deliveries
for all
using (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
))
with check (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
));

create policy "Admins manage access expiry email settings"
on public.access_expiry_email_settings
for all
using (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
))
with check (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
));

create policy "Admins manage access expiry email logs"
on public.access_expiry_email_logs
for all
using (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
))
with check (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
));

insert into public.access_expiry_email_settings (id)
values (true)
on conflict (id) do nothing;
