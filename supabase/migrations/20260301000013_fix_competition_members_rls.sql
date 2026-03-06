-- 013: Fix competition_members RLS to allow co-members to see each other.
--
-- The original policy only lets users read their own row, which blocks
-- the standings, history, and other pages from showing other players.
--
-- We use a SECURITY DEFINER function to avoid the self-referencing
-- policy issue that causes query hangs (noted in 010_rls_policies.sql).

-- 1. Helper function: returns competition IDs the current user belongs to
--    Runs as the table owner (bypasses RLS), so it won't recurse.
create or replace function get_my_competition_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select competition_id
  from competition_members
  where user_id = auth.uid();
$$;

-- 2. Drop the old restrictive policy
drop policy if exists "Users can read own memberships" on competition_members;

-- 3. Create a new policy: members can see all members in their competitions
create policy "Members can read competition memberships"
  on competition_members for select
  to authenticated
  using (competition_id in (select get_my_competition_ids()));
