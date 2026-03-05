-- 009: scores table
create table scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  race_id uuid not null references races on delete cascade,
  competition_id uuid not null references competitions on delete cascade,
  race_points integer not null default 0,
  sprint_points integer not null default 0,
  total_points integer not null default 0,
  race_position_off integer,
  sprint_position_off integer,
  unique (user_id, race_id, competition_id)
);

alter table scores enable row level security;
