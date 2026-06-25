alter table public.purchase_requests
  add column if not exists approved_for_post boolean not null default false;

alter table public.purchase_requests
  add column if not exists requested_post_id uuid references public.posts(id) on delete set null;

alter table public.purchase_requests
  add column if not exists requested_post_slug text;

alter table public.purchase_requests
  add column if not exists requested_post_title text;

alter table public.purchase_requests
  add column if not exists requested_post_price numeric(10,2);

create index if not exists purchase_requests_approved_for_post_idx
  on public.purchase_requests (approved_for_post, created_at desc);

create index if not exists purchase_requests_requested_post_id_idx
  on public.purchase_requests (requested_post_id);
