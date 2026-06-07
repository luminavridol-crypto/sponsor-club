create table if not exists public.telegram_access_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  reminder_kind text not null check (reminder_kind in ('expires_7_days', 'expires_3_days', 'access_disabled')),
  sent_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, expires_at, reminder_kind)
);

alter table public.telegram_access_reminder_logs enable row level security;

create policy "Admins manage telegram access reminder logs"
on public.telegram_access_reminder_logs
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
