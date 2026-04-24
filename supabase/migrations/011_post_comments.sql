create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 1000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists post_comments_post_id_created_at_idx
  on public.post_comments (post_id, created_at desc);

create index if not exists post_comments_profile_id_idx
  on public.post_comments (profile_id);

alter table public.post_comments enable row level security;

create policy "Members read comments for accessible posts"
on public.post_comments
for select
using (
  exists (
    select 1 from public.posts
    where posts.id = post_comments.post_id
      and posts.status = 'published'
      and posts.publish_at <= timezone('utc', now())
      and public.can_access_tier(posts.required_tier)
  )
);

create policy "Members insert comments for accessible posts"
on public.post_comments
for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.posts
    where posts.id = post_comments.post_id
      and posts.status = 'published'
      and posts.publish_at <= timezone('utc', now())
      and public.can_access_tier(posts.required_tier)
  )
);

create policy "Members delete own comments"
on public.post_comments
for delete
using (profile_id = auth.uid());

create policy "Admins manage post comments"
on public.post_comments
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
