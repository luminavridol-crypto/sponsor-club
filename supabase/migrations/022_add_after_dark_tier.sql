alter type sponsor_tier add value if not exists 'tier_4';

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
          and profiles.access_status = 'active'
          and (profiles.access_expires_at is null or profiles.access_expires_at > timezone('utc', now()))
          and (
            profiles.tier = 'tier_4'
            or (profiles.tier = 'tier_3' and posts.required_tier in ('tier_1', 'tier_2', 'tier_3'))
            or (profiles.tier = 'tier_2' and posts.required_tier in ('tier_1', 'tier_2'))
            or (profiles.tier = 'tier_1' and posts.required_tier = 'tier_1')
          )
        )
      )
  )
$$;
