do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'file'
      and enumtypid = 'media_type'::regtype
  ) then
    alter type media_type add value 'file';
  end if;
end $$;

alter table public.posts
  add column if not exists thumbnail_provider text,
  add column if not exists thumbnail_bucket text,
  add column if not exists thumbnail_object_key text,
  add column if not exists thumbnail_mime_type text,
  add column if not exists thumbnail_size_bytes bigint,
  add column if not exists thumbnail_legacy_path text;

alter table public.post_media
  add column if not exists storage_provider text,
  add column if not exists storage_bucket text,
  add column if not exists storage_object_key text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists legacy_storage_path text;

alter table public.member_chat_messages
  add column if not exists media_provider text,
  add column if not exists media_bucket text,
  add column if not exists media_object_key text,
  add column if not exists media_mime_type text,
  add column if not exists media_size_bytes bigint,
  add column if not exists media_legacy_path text;

alter table public.profiles
  add column if not exists avatar_provider text,
  add column if not exists avatar_bucket text,
  add column if not exists avatar_object_key text,
  add column if not exists avatar_mime_type text,
  add column if not exists avatar_size_bytes bigint,
  add column if not exists avatar_legacy_url text;

update public.posts
set
  thumbnail_provider = case
    when thumbnail_path is null then thumbnail_provider
    when thumbnail_path like 'r2:%' then 'r2'
    else coalesce(thumbnail_provider, 'supabase')
  end,
  thumbnail_bucket = case
    when thumbnail_path is null then thumbnail_bucket
    else coalesce(thumbnail_bucket, 'post-media')
  end,
  thumbnail_object_key = case
    when thumbnail_path is null then thumbnail_object_key
    when thumbnail_path like 'r2:%' then substring(thumbnail_path from 4)
    else coalesce(thumbnail_object_key, thumbnail_path)
  end
where thumbnail_path is not null;

update public.post_media
set
  storage_provider = case
    when storage_path like 'r2:%' then 'r2'
    else coalesce(storage_provider, 'supabase')
  end,
  storage_bucket = coalesce(storage_bucket, 'post-media'),
  storage_object_key = case
    when storage_path like 'r2:%' then substring(storage_path from 4)
    else coalesce(storage_object_key, storage_path)
  end
where storage_path is not null;

update public.member_chat_messages
set
  media_provider = case
    when media_path is null then media_provider
    when media_path like 'r2:%' then 'r2'
    else coalesce(media_provider, 'supabase')
  end,
  media_bucket = case
    when media_path is null then media_bucket
    else coalesce(media_bucket, 'chat-media')
  end,
  media_object_key = case
    when media_path is null then media_object_key
    when media_path like 'r2:%' then substring(media_path from 4)
    else coalesce(media_object_key, media_path)
  end
where media_path is not null;

alter table public.posts
  add constraint posts_thumbnail_provider_check
  check (thumbnail_provider is null or thumbnail_provider in ('r2', 'supabase'))
  not valid;

alter table public.post_media
  add constraint post_media_storage_provider_check
  check (storage_provider is null or storage_provider in ('r2', 'supabase'))
  not valid;

alter table public.member_chat_messages
  add constraint member_chat_media_provider_check
  check (media_provider is null or media_provider in ('r2', 'supabase'))
  not valid;

alter table public.profiles
  add constraint profiles_avatar_provider_check
  check (avatar_provider is null or avatar_provider in ('r2', 'supabase'))
  not valid;
