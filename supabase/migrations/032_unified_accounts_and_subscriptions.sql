-- One Lumina account, identity map and subscription source for web + Telegram.
-- Existing profile access fields remain as a backwards-compatible cache.

alter table public.profiles
  alter column email drop not null,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('email', 'telegram')),
  provider_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_subject),
  unique (user_id, provider)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  tier smallint not null default 0 check (tier between 0 and 4),
  status text not null default 'pending' check (status in ('active', 'expired', 'pending', 'cancelled')),
  started_at timestamptz,
  expires_at timestamptz,
  payment_source text,
  auto_renew boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_identities_user_id_idx on public.user_identities(user_id);
create index if not exists subscriptions_status_expires_at_idx on public.subscriptions(status, expires_at);

drop trigger if exists user_identities_set_updated_at on public.user_identities;
create trigger user_identities_set_updated_at
before update on public.user_identities
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

insert into public.user_identities (user_id, provider, provider_subject)
select id, 'email', id::text from public.profiles
on conflict (provider, provider_subject) do nothing;

insert into public.user_identities (user_id, provider, provider_subject)
select id, 'telegram', telegram_id from public.profiles where telegram_id is not null
on conflict (provider, provider_subject) do nothing;

insert into public.subscriptions (user_id, tier, status, started_at, expires_at, payment_source)
select
  id,
  case tier::text when 'tier_4' then 4 when 'tier_3' then 3 when 'tier_2' then 2 else 1 end,
  case
    when access_status = 'active' and (access_expires_at is null or access_expires_at > timezone('utc', now())) then 'active'
    when access_expires_at is not null and access_expires_at <= timezone('utc', now()) then 'expired'
    else 'cancelled'
  end,
  created_at,
  access_expires_at,
  case when auth_source = 'telegram' then 'telegram_legacy' else 'web_legacy' end
from public.profiles
on conflict (user_id) do nothing;

create or replace function public.initialize_profile_account_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_identities(user_id, provider, provider_subject)
  values (new.id, 'email', new.id::text)
  on conflict (provider, provider_subject) do nothing;

  if new.telegram_id is not null then
    insert into public.user_identities(user_id, provider, provider_subject)
    values (new.id, 'telegram', new.telegram_id)
    on conflict (provider, provider_subject) do nothing;
  end if;

  insert into public.subscriptions(user_id, tier, status, started_at, expires_at, payment_source)
  values (
    new.id,
    case new.tier::text when 'tier_4' then 4 when 'tier_3' then 3 when 'tier_2' then 2 else 1 end,
    case when new.access_status = 'active' then 'active' else 'cancelled' end,
    case when new.access_status = 'active' then timezone('utc', now()) else null end,
    new.access_expires_at,
    'profile_creation'
  )
  on conflict (user_id) do nothing;
  return new;
end
$$;

drop trigger if exists profiles_initialize_account_records on public.profiles;
create trigger profiles_initialize_account_records
after insert on public.profiles
for each row execute function public.initialize_profile_account_records();

create or replace function public.subscription_tier_name(value smallint)
returns sponsor_tier
language sql
immutable
set search_path = public
as $$
  select case value
    when 4 then 'tier_4'::sponsor_tier
    when 3 then 'tier_3'::sponsor_tier
    when 2 then 'tier_2'::sponsor_tier
    when 1 then 'tier_1'::sponsor_tier
    else null
  end
$$;

create or replace function public.sync_profile_access_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    tier = coalesce(public.subscription_tier_name(new.tier), tier),
    access_status = case
      when new.tier > 0 and new.status = 'active' and (new.expires_at is null or new.expires_at > timezone('utc', now()))
        then 'active'::access_status
      else 'disabled'::access_status
    end,
    access_expires_at = new.expires_at
  where id = new.user_id;
  return new;
end
$$;

drop trigger if exists subscriptions_sync_profile_access on public.subscriptions;
create trigger subscriptions_sync_profile_access
after insert or update of tier, status, expires_at on public.subscriptions
for each row execute function public.sync_profile_access_from_subscription();

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select ui.user_id
      from public.user_identities ui
      where ui.provider = 'email' and ui.provider_subject = (select auth.uid())::text
      limit 1
    ),
    (select auth.uid())
  )
$$;

create or replace function public.current_user_role()
returns app_role
language sql
stable
set search_path = public
as $$
  select role from public.profiles where id = public.current_profile_id()
$$;

create or replace function public.current_user_subscription_tier()
returns smallint
language sql
stable
set search_path = public
as $$
  select case
    when p.role = 'admin' then 4::smallint
    when s.status = 'active' and (s.expires_at is null or s.expires_at > timezone('utc', now())) then s.tier
    else 0::smallint
  end
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id
  where p.id = public.current_profile_id()
$$;

create or replace function public.current_user_tier()
returns sponsor_tier
language sql
stable
set search_path = public
as $$
  select public.subscription_tier_name(public.current_user_subscription_tier())
$$;

create or replace function public.current_user_has_club_access()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(public.current_user_subscription_tier() > 0, false)
$$;

create or replace function public.current_user_can_access_post(target_post_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    left join public.profiles viewer on viewer.id = public.current_profile_id()
    where p.id = target_post_id
      and p.status = 'published'
      and p.publish_at <= timezone('utc', now())
      and (p.expires_at is null or p.expires_at > timezone('utc', now()))
      and (
        coalesce(viewer.role = 'admin', false)
        or (
          p.slug like 'path-%'
          and coalesce(viewer.is_open_club_member, false)
          and not coalesce(viewer.is_open_club_blocked, false)
        )
        or (
          p.slug not like 'path-%'
          and public.current_user_has_club_access()
          and public.can_access_tier(p.required_tier)
        )
      )
  )
$$;

alter table public.user_identities enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Users read own identities" on public.user_identities;
create policy "Users read own identities" on public.user_identities
for select using (user_id = public.current_profile_id());

drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription" on public.subscriptions
for select using (user_id = public.current_profile_id());

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile" on public.profiles
for select using (id = public.current_profile_id());

drop policy if exists "Admins manage identities" on public.user_identities;
create policy "Admins manage identities" on public.user_identities
for all using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists "Admins manage subscriptions" on public.subscriptions;
create policy "Admins manage subscriptions" on public.subscriptions
for all using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

grant select on public.user_identities, public.subscriptions to authenticated;
