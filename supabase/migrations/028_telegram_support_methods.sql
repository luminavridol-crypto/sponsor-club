create table if not exists public.telegram_support_methods (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null default '',
  note text not null default '',
  sort_order integer not null default 0,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists telegram_support_methods_set_updated_at on public.telegram_support_methods;

create trigger telegram_support_methods_set_updated_at
before update on public.telegram_support_methods
for each row
execute function public.set_updated_at();

alter table public.telegram_support_methods enable row level security;

drop policy if exists "Admins manage telegram support methods" on public.telegram_support_methods;

create policy "Admins manage telegram support methods"
on public.telegram_support_methods
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
