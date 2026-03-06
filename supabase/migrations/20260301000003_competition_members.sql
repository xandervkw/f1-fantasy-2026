-- 003: competition_members table
create table competition_members (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  unique (competition_id, user_id)
);

alter table competition_members enable row level security;
