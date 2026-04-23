do $$
begin
  if not exists (select 1 from pg_type where typname = 'purchase_request_status') then
    create type purchase_request_status as enum ('new', 'in_progress', 'completed');
  end if;
end $$;

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  tier sponsor_tier not null,
  email text not null,
  country text not null,
  contact text not null,
  status purchase_request_status not null default 'new',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists purchase_requests_status_idx
  on public.purchase_requests(status, created_at desc);

create or replace function public.set_purchase_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists purchase_requests_set_updated_at on public.purchase_requests;

create trigger purchase_requests_set_updated_at
before update on public.purchase_requests
for each row
execute function public.set_purchase_request_updated_at();

alter table public.purchase_requests enable row level security;

create policy "Admins manage purchase requests"
on public.purchase_requests
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
