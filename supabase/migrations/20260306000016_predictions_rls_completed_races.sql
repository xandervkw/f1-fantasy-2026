-- 016: Fix predictions RLS for history page
-- Allow competition members to read ALL predictions for completed races
-- (not just locked ones). Once a race is done, everyone can see predictions.

-- Drop the old policy that only works for is_locked = true
DROP POLICY IF EXISTS "Members can read locked predictions" ON predictions;

-- New policy: members can read predictions for completed races
CREATE POLICY "Members can read completed race predictions"
  ON predictions FOR SELECT
  TO authenticated
  USING (
    -- Race is completed → all predictions visible to competition members
    EXISTS (
      SELECT 1 FROM races r
      WHERE r.id = predictions.race_id
        AND r.status = 'completed'
    )
    AND competition_id IN (
      SELECT competition_id FROM competition_members
      WHERE user_id = auth.uid()
    )
  );

-- Also keep a policy for locked predictions on active races
-- (so players can see others' locked predictions during the weekend)
CREATE POLICY "Members can read locked predictions in competition"
  ON predictions FOR SELECT
  TO authenticated
  USING (
    (is_locked = true OR is_sprint_locked = true)
    AND competition_id IN (
      SELECT competition_id FROM competition_members
      WHERE user_id = auth.uid()
    )
  );
