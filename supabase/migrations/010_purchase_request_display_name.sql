alter table public.purchase_requests
  add column if not exists display_name text;
