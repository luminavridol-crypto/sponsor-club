create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'sponsor_tier') then
    create type sponsor_tier as enum ('tier_1', 'tier_2', 'tier_3');
  end if;

  if not exists (select 1 from pg_type where typname = 'access_status') then
    create type access_status as enum ('active', 'disabled');
  end if;

  if not exists (select 1 from pg_type where typname = 'post_type') then
    create type post_type as enum ('gallery', 'video', 'text', 'announcement');
  end if;

  if not exists (select 1 from pg_type where typname = 'post_status') then
    create type post_status as enum ('draft', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'media_type') then
    create type media_type as enum ('image', 'video');
  end if;
end $$;

create or replace function public.current_user_tier()
returns sponsor_tier
language sql
stable
as $$
  select tier from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.can_access_tier(required sponsor_tier)
returns boolean
language sql
stable
as $$
  select case
    when public.current_user_tier() = 'tier_3' then true
    when public.current_user_tier() = 'tier_2' and required in ('tier_1', 'tier_2') then true
    when public.current_user_tier() = 'tier_1' and required = 'tier_1' then true
    else false
  end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role app_role not null default 'member',
  tier sponsor_tier not null default 'tier_1',
  access_status access_status not null default 'active',
  bio text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  email text,
  assigned_tier sponsor_tier not null default 'tier_1',
  note text,
  expires_at timestamptz,
  used_at timestamptz,
  disabled_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  used_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  body text,
  post_type post_type not null default 'announcement',
  required_tier sponsor_tier not null default 'tier_1',
  status post_status not null default 'draft',
  publish_at timestamptz not null default timezone('utc', now()),
  thumbnail_path text,
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  media_type media_type not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;

create policy "Users can read their profile"
on public.profiles
for select
using (id = auth.uid());

create policy "Users can update their own profile basics"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can manage profiles"
on public.profiles
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Admins manage invites"
on public.invites
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Members read allowed published posts"
on public.posts
for select
using (
  status = 'published'
  and publish_at <= timezone('utc', now())
  and public.can_access_tier(required_tier)
);

create policy "Admins manage posts"
on public.posts
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Members read media for accessible posts"
on public.post_media
for select
using (
  exists (
    select 1 from public.posts
    where posts.id = post_media.post_id
      and posts.status = 'published'
      and posts.publish_at <= timezone('utc', now())
      and public.can_access_tier(posts.required_tier)
  )
);

create policy "Admins manage post media"
on public.post_media
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
