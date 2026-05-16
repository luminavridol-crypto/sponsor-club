create table if not exists public.post_email_templates (
  post_id uuid primary key references public.posts(id) on delete cascade,
  subject text not null,
  body text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.post_email_templates enable row level security;

create policy "Admins manage post email templates"
on public.post_email_templates
for all
using (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
))
with check (exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'admin'
));
