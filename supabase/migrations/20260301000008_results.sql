-- 008: results table
create table results (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races on delete cascade,
  driver_id uuid not null references drivers on delete cascade,
  finish_position_race integer,
  finish_position_sprint integer,
  is_dnf_race boolean not null default false,
  is_dnf_sprint boolean not null default false,
  unique (race_id, driver_id)
);

alter table results enable row level security;
