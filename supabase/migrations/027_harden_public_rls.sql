create or replace function public.current_user_tier()
returns sponsor_tier
language sql
stable
set search_path = public
as $$
  select case
    when profiles.role = 'admin' then 'tier_4'::sponsor_tier
    when coalesce(profiles.admin_badges, '{}'::text[]) @> array['after_dark']::text[] then 'tier_4'::sponsor_tier
    else profiles.tier
  end
  from public.profiles
  where profiles.id = (select auth.uid())
$$;

create or replace function public.can_access_tier(required sponsor_tier)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when public.current_user_tier() = 'tier_4' then true
    when public.current_user_tier() = 'tier_3' and required in ('tier_1', 'tier_2', 'tier_3') then true
    when public.current_user_tier() = 'tier_2' and required in ('tier_1', 'tier_2') then true
    when public.current_user_tier() = 'tier_1' and required = 'tier_1' then true
    else false
  end
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
          and public.current_user_has_club_access()
          and public.can_access_tier(posts.required_tier)
        )
      )
  )
$$;

drop policy if exists "Users can update their own profile basics" on public.profiles;

drop policy if exists "Members read allowed published posts" on public.posts;
create policy "Members read allowed published posts"
on public.posts
for select
using (public.current_user_can_access_post(id));

drop policy if exists "Members read media for accessible posts" on public.post_media;
create policy "Members read media for accessible posts"
on public.post_media
for select
using (public.current_user_can_access_post(post_id));

drop policy if exists "Members read comments for accessible posts" on public.post_comments;
create policy "Members read comments for accessible posts"
on public.post_comments
for select
using (public.current_user_can_access_post(post_id));

drop policy if exists "Members insert comments for accessible posts" on public.post_comments;
create policy "Members insert comments for accessible posts"
on public.post_comments
for insert
with check (
  profile_id = (select auth.uid())
  and public.current_user_can_access_post(post_id)
);

drop policy if exists "Members read reactions for accessible posts" on public.post_reactions;
create policy "Members read reactions for accessible posts"
on public.post_reactions
for select
using (public.current_user_can_access_post(post_id));

drop policy if exists "Members manage own reactions" on public.post_reactions;
create policy "Members manage own reactions"
on public.post_reactions
for all
using (
  profile_id = (select auth.uid())
  and public.current_user_can_access_post(post_id)
)
with check (
  profile_id = (select auth.uid())
  and public.current_user_can_access_post(post_id)
);
