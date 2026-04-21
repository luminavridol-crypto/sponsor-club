alter table public.posts
add column if not exists retention_days integer,
add column if not exists expires_at timestamptz;
