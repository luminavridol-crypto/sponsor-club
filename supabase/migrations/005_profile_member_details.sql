alter table public.profiles
  add column if not exists nickname text,
  add column if not exists telegram_contact text,
  add column if not exists tiktok_contact text,
  add column if not exists admin_note text,
  add column if not exists admin_badges text[] not null default '{}';
