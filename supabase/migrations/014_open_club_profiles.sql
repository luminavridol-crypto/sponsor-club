alter table public.profiles
  add column if not exists is_open_club_member boolean not null default false,
  add column if not exists open_club_joined_at timestamptz;

update public.profiles
set
  is_open_club_member = true,
  open_club_joined_at = coalesce(open_club_joined_at, created_at)
where role = 'admin';
