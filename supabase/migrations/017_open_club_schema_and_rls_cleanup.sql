do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

alter table public.profiles
  add column if not exists is_open_club_member boolean not null default false,
  add column if not exists open_club_joined_at timestamptz,
  add column if not exists is_open_club_blocked boolean not null default false,
  add column if not exists open_club_chat_disabled boolean not null default false,
  add column if not exists open_club_chat_disabled_at timestamptz;

update public.profiles
set
  is_open_club_member = true,
  open_club_joined_at = coalesce(open_club_joined_at, created_at)
where role = 'admin';

create or replace function public.current_user_tier()
returns sponsor_tier
language sql
stable
set search_path = public
as $$
  select tier from public.profiles where id = (select auth.uid())
$$;

create or replace function public.current_user_role()
returns app_role
language sql
stable
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.can_access_tier(required sponsor_tier)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when public.current_user_tier() = 'tier_3' then true
    when public.current_user_tier() = 'tier_2' and required in ('tier_1', 'tier_2') then true
    when public.current_user_tier() = 'tier_1' and required = 'tier_1' then true
    else false
  end
$$;

alter function public.set_purchase_request_updated_at()
  set search_path = public;

create or replace function public.current_user_has_club_access()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and (
        role = 'admin'
        or (
          access_status = 'active'
          and (access_expires_at is null or access_expires_at > timezone('utc', now()))
        )
      )
  )
$$;

create or replace function public.current_user_can_access_open_club()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and (
        role = 'admin'
        or coalesce(is_open_club_member, false)
      )
      and not coalesce(is_open_club_blocked, false)
  )
$$;

create or replace function public.current_user_can_write_open_club()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and (
        role = 'admin'
        or (
          coalesce(is_open_club_member, false)
          and not coalesce(is_open_club_blocked, false)
          and not coalesce(open_club_chat_disabled, false)
        )
      )
  )
$$;

create or replace function public.current_user_can_access_post(target_post_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.posts
    left join public.profiles on profiles.id = (select auth.uid())
    where posts.id = target_post_id
      and posts.status = 'published'
      and posts.publish_at <= timezone('utc', now())
      and (posts.expires_at is null or posts.expires_at > timezone('utc', now()))
      and (
        coalesce(profiles.role = 'admin', false)
        or (
          posts.slug like 'path-%'
          and coalesce(profiles.is_open_club_member, false)
          and not coalesce(profiles.is_open_club_blocked, false)
        )
        or (
          posts.slug not like 'path-%'
          and profiles.access_status = 'active'
          and (profiles.access_expires_at is null or profiles.access_expires_at > timezone('utc', now()))
          and (
            profiles.tier = 'tier_3'
            or (profiles.tier = 'tier_2' and posts.required_tier in ('tier_1', 'tier_2'))
            or (profiles.tier = 'tier_1' and posts.required_tier = 'tier_1')
          )
        )
      )
  )
$$;

alter table public.posts
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz;

create index if not exists posts_is_pinned_publish_at_idx
  on public.posts (is_pinned desc, pinned_at desc, publish_at desc);

create index if not exists donation_events_created_by_idx
  on public.donation_events (created_by);

create index if not exists invites_created_by_idx
  on public.invites (created_by);

create index if not exists invites_used_by_idx
  on public.invites (used_by);

create index if not exists post_media_post_id_idx
  on public.post_media (post_id);

create index if not exists posts_author_id_idx
  on public.posts (author_id);

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

drop policy if exists "Anyone can read open club messages" on public.open_club_messages;
drop policy if exists "Signed in users can post open club messages" on public.open_club_messages;
drop policy if exists "Members delete own open club messages" on public.open_club_messages;
drop policy if exists "Admins manage open club messages" on public.open_club_messages;

create policy "Open club members can read open club messages"
on public.open_club_messages
for select
using (public.current_user_can_access_open_club());

create policy "Open club members can post open club messages"
on public.open_club_messages
for insert
with check (
  author_id = (select auth.uid())
  and public.current_user_can_write_open_club()
);

create policy "Members delete own open club messages"
on public.open_club_messages
for delete
using (author_id = (select auth.uid()));

create policy "Admins manage open club messages"
on public.open_club_messages
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create table if not exists public.post_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('heart', 'fire', 'cry', 'sparkles', 'devil')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (comment_id, profile_id)
);

create index if not exists post_comment_reactions_comment_id_idx
  on public.post_comment_reactions (comment_id);

create index if not exists post_comment_reactions_profile_id_idx
  on public.post_comment_reactions (profile_id);

alter table public.post_comment_reactions enable row level security;

drop policy if exists "Members read reactions for accessible comments" on public.post_comment_reactions;
drop policy if exists "Members manage own comment reactions" on public.post_comment_reactions;
drop policy if exists "Admins manage comment reactions" on public.post_comment_reactions;

create policy "Members read reactions for accessible comments"
on public.post_comment_reactions
for select
using (
  exists (
    select 1
    from public.post_comments
    where post_comments.id = post_comment_reactions.comment_id
      and public.current_user_can_access_post(post_comments.post_id)
  )
);

create policy "Members manage own comment reactions"
on public.post_comment_reactions
for all
using (profile_id = (select auth.uid()))
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.post_comments
    where post_comments.id = post_comment_reactions.comment_id
      and public.current_user_can_access_post(post_comments.post_id)
  )
);

create policy "Admins manage comment reactions"
on public.post_comment_reactions
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
