-- 004: races table
create table races (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  round_number integer not null,
  race_name text not null,
  circuit text not null,
  race_date date not null,
  qualifying_time timestamptz not null,
  sprint_qualifying_time timestamptz,
  is_sprint_weekend boolean not null default false,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'completed')),
  unique (season, round_number)
);

alter table races enable row level security;
