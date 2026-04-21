alter table public.profiles
add column if not exists birth_date date,
add column if not exists total_donations numeric(10,2) not null default 0,
add column if not exists access_expires_at timestamptz;
