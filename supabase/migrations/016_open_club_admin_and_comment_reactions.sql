alter table public.profiles
  add column if not exists is_open_club_blocked boolean not null default false,
  add column if not exists open_club_chat_disabled boolean not null default false,
  add column if not exists open_club_chat_disabled_at timestamptz;

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

create policy "Members read reactions for accessible comments"
on public.post_comment_reactions
for select
using (
  exists (
    select 1
    from public.post_comments
    join public.posts on posts.id = post_comments.post_id
    where post_comments.id = post_comment_reactions.comment_id
      and posts.status = 'published'
      and posts.publish_at <= timezone('utc', now())
      and public.can_access_tier(posts.required_tier)
  )
);

create policy "Members manage own comment reactions"
on public.post_comment_reactions
for all
using (profile_id = auth.uid())
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.post_comments
    join public.posts on posts.id = post_comments.post_id
    where post_comments.id = post_comment_reactions.comment_id
      and posts.status = 'published'
      and posts.publish_at <= timezone('utc', now())
      and public.can_access_tier(posts.required_tier)
  )
);

create policy "Admins manage comment reactions"
on public.post_comment_reactions
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
