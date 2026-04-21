alter table public.donation_events
  add column if not exists donation_year integer,
  add column if not exists donation_month integer;

update public.donation_events
set
  donation_year = extract(year from created_at at time zone 'utc')::int,
  donation_month = extract(month from created_at at time zone 'utc')::int
where donation_year is null
   or donation_month is null;

alter table public.donation_events
  alter column donation_year set default extract(year from timezone('utc', now()))::int,
  alter column donation_month set default extract(month from timezone('utc', now()))::int;

alter table public.donation_events
  alter column donation_year set not null,
  alter column donation_month set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'donation_events_donation_month_check'
  ) then
    alter table public.donation_events
      add constraint donation_events_donation_month_check
      check (donation_month between 1 and 12);
  end if;
end $$;

create index if not exists donation_events_profile_period_idx
  on public.donation_events (profile_id, donation_year, donation_month);

create index if not exists donation_events_period_idx
  on public.donation_events (donation_year, donation_month);
