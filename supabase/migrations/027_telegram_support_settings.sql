create table if not exists public.telegram_support_settings (
  id boolean primary key default true check (id = true),
  card_label text not null default 'Карта',
  card_number text not null default '',
  note text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists telegram_support_settings_set_updated_at on public.telegram_support_settings;

create trigger telegram_support_settings_set_updated_at
before update on public.telegram_support_settings
for each row
execute function public.set_updated_at();

alter table public.telegram_support_settings enable row level security;

drop policy if exists "Admins manage telegram support settings" on public.telegram_support_settings;

create policy "Admins manage telegram support settings"
on public.telegram_support_settings
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

insert into public.telegram_support_settings (id)
values (true)
on conflict (id) do nothing;
