alter table public.posts
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz;

create index if not exists posts_is_pinned_publish_at_idx
  on public.posts (is_pinned desc, pinned_at desc, publish_at desc);

create table if not exists public.open_club_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  is_pinned boolean not null default false,
  pinned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists open_club_messages_created_at_idx
  on public.open_club_messages (is_pinned desc, pinned_at desc, created_at desc);

alter table public.open_club_messages enable row level security;

create policy "Anyone can read open club messages"
on public.open_club_messages
for select
using (true);

create policy "Signed in users can post open club messages"
on public.open_club_messages
for insert
with check (author_id = auth.uid());

create policy "Members delete own open club messages"
on public.open_club_messages
for delete
using (author_id = auth.uid());

create policy "Admins manage open club messages"
on public.open_club_messages
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
