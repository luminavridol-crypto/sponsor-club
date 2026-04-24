create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('heart', 'fire', 'cry', 'sparkles', 'devil')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (post_id, profile_id)
);

create index if not exists post_reactions_post_id_idx
  on public.post_reactions (post_id);

create index if not exists post_reactions_profile_id_idx
  on public.post_reactions (profile_id);

alter table public.post_reactions enable row level security;

create policy "Members read reactions for accessible posts"
on public.post_reactions
for select
using (
  exists (
    select 1 from public.posts
    where posts.id = post_reactions.post_id
      and posts.status = 'published'
      and posts.publish_at <= timezone('utc', now())
      and public.can_access_tier(posts.required_tier)
  )
);

create policy "Members manage own reactions"
on public.post_reactions
for all
using (profile_id = auth.uid())
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.posts
    where posts.id = post_reactions.post_id
      and posts.status = 'published'
      and posts.publish_at <= timezone('utc', now())
      and public.can_access_tier(posts.required_tier)
  )
);

create policy "Admins manage post reactions"
on public.post_reactions
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
