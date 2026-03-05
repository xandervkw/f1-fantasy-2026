-- 007: predictions table
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  race_id uuid not null references races on delete cascade,
  competition_id uuid not null references competitions on delete cascade,
  predicted_position_race integer,
  predicted_position_sprint integer,
  submitted_at timestamptz not null default now(),
  is_locked boolean not null default false,
  is_missed boolean not null default false,
  unique (user_id, race_id, competition_id)
);

alter table predictions enable row level security;
