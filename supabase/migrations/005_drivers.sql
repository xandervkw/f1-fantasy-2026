-- 005: drivers table
create table drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  abbreviation text not null,
  team text not null,
  season integer not null
);

alter table drivers enable row level security;
