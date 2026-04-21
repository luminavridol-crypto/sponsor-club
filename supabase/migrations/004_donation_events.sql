create table if not exists public.donation_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.donation_events enable row level security;

create policy "Admins can manage donation events"
on public.donation_events
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
