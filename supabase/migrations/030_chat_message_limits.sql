alter table public.member_chat_messages
  add column if not exists counts_against_monthly_limit boolean not null default true;

alter table public.purchase_requests
  add column if not exists request_kind text not null default 'tier'
  check (request_kind in ('tier', 'post', 'chat_messages'));

alter table public.purchase_requests
  add column if not exists chat_messages_count integer not null default 0
  check (chat_messages_count >= 0);

alter table public.purchase_requests
  add column if not exists approved_for_chat_messages boolean not null default false;

create table if not exists public.member_chat_message_grants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  purchase_request_id uuid references public.purchase_requests(id) on delete set null,
  message_count integer not null check (message_count > 0),
  valid_from timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists member_chat_message_grants_profile_active_idx
  on public.member_chat_message_grants(profile_id, expires_at desc);

create index if not exists purchase_requests_chat_messages_idx
  on public.purchase_requests(request_kind, approved_for_chat_messages, created_at desc);

alter table public.member_chat_message_grants enable row level security;

grant select on public.member_chat_message_grants to authenticated;
grant select, insert, update, delete on public.member_chat_message_grants to service_role;

drop policy if exists "Admins manage member chat message grants" on public.member_chat_message_grants;
drop policy if exists "Members read own member chat message grants" on public.member_chat_message_grants;

create policy "Admins manage member chat message grants"
on public.member_chat_message_grants
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Members read own member chat message grants"
on public.member_chat_message_grants
for select
using (profile_id = (select auth.uid()));

notify pgrst, 'reload schema';
