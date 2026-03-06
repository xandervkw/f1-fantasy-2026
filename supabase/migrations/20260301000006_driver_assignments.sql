-- 006: driver_assignments table
create table driver_assignments (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions on delete cascade,
  race_id uuid not null references races on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  driver_id uuid not null references drivers on delete cascade,
  unique (competition_id, race_id, user_id)
);

alter table driver_assignments enable row level security;
