-- 001: competitions table
create table competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  season_year integer not null,
  created_at timestamptz not null default now()
);

alter table competitions enable row level security;
