alter table public.posts
  add column if not exists is_sellable boolean not null default false;

alter table public.posts
  add column if not exists sale_price numeric(10,2);
