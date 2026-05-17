alter table public.profiles
  add column if not exists auth_source text not null default 'web',
  add column if not exists telegram_id text unique,
  add column if not exists telegram_username text,
  add column if not exists telegram_photo_url text,
  add column if not exists telegram_first_name text,
  add column if not exists telegram_last_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_auth_source_check'
  ) then
    alter table public.profiles
      add constraint profiles_auth_source_check
      check (auth_source in ('web', 'telegram'));
  end if;
end $$;

create table if not exists public.donation_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  suggested_tier sponsor_tier not null default 'tier_1',
  amount numeric(10, 2),
  note text,
  status text not null default 'new',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'donation_claims_status_check'
  ) then
    alter table public.donation_claims
      add constraint donation_claims_status_check
      check (status in ('new', 'in_review', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists profiles_telegram_id_idx
  on public.profiles (telegram_id)
  where telegram_id is not null;

create index if not exists donation_claims_profile_created_at_idx
  on public.donation_claims (profile_id, created_at desc);

create index if not exists donation_claims_status_created_at_idx
  on public.donation_claims (status, created_at desc);

drop trigger if exists donation_claims_set_updated_at on public.donation_claims;

create trigger donation_claims_set_updated_at
before update on public.donation_claims
for each row
execute function public.set_updated_at();

alter table public.donation_claims enable row level security;

create policy "Admins can manage donation claims"
on public.donation_claims
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Users can read own donation claims"
on public.donation_claims
for select
using (profile_id = auth.uid());
