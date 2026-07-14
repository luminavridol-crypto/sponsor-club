do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'audio' and enumtypid = 'media_type'::regtype
  ) then
    alter type media_type add value 'audio';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumlabel = 'audio' and enumtypid = 'post_type'::regtype
  ) then
    alter type post_type add value 'audio';
  end if;
end $$;

alter table public.post_comments
  add column if not exists media_path text,
  add column if not exists media_provider text,
  add column if not exists media_bucket text,
  add column if not exists media_object_key text,
  add column if not exists media_mime_type text,
  add column if not exists media_size_bytes bigint,
  add column if not exists media_type media_type;

alter table public.post_comments
  drop constraint if exists post_comments_body_check,
  drop constraint if exists post_comments_body_or_media_check,
  drop constraint if exists post_comments_media_provider_check;

alter table public.post_comments
  add constraint post_comments_body_or_media_check
  check (
    (char_length(trim(body)) > 0 and char_length(body) <= 1000)
    or (media_path is not null and media_type::text = 'audio')
  );

alter table public.post_comments
  add constraint post_comments_media_provider_check
  check (media_provider is null or media_provider in ('r2', 'supabase'))
  not valid;
