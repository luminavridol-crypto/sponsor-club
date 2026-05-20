alter table public.purchase_requests
  add column if not exists approved_for_club boolean not null default false;

create index if not exists purchase_requests_approved_for_club_idx
  on public.purchase_requests (approved_for_club, created_at desc);
