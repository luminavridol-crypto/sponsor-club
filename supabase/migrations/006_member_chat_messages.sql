create table if not exists public.member_chat_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('admin', 'member')),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists member_chat_messages_profile_id_idx
  on public.member_chat_messages (profile_id, created_at desc);

alter table public.member_chat_messages enable row level security;

create policy "Admins can manage member chat messages"
on public.member_chat_messages
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Members can read own member chat messages"
on public.member_chat_messages
for select
using (profile_id = auth.uid());

create policy "Members can insert own member chat messages"
on public.member_chat_messages
for insert
with check (profile_id = auth.uid() and sender_role = 'member');
