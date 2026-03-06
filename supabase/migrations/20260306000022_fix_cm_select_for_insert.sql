-- Fix: Allow users to read their own competition_members row.
-- This is needed because PostgREST checks SELECT policies even on INSERT (RETURNING).
-- Without this, new users joining a competition get RLS violation because
-- the "Members can read competition memberships" policy can't see the row
-- (the membership doesn't exist yet when the SELECT check runs).

CREATE POLICY "Users can read own memberships"
  ON competition_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
