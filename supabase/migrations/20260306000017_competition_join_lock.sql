-- 017: Competition join lock + late-joiner assignment system
--
-- 1. Add accepting_members flag to competitions (default true)
-- 2. Update RLS on competition_members to check accepting_members
-- 3. Create assign_late_joiner() RPC for auto-assigning drivers to late joiners

-- ============================================================
-- 1. Add accepting_members column
-- ============================================================
ALTER TABLE competitions
  ADD COLUMN accepting_members boolean NOT NULL DEFAULT true;

-- ============================================================
-- 2. Update competition_members INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can join competitions" ON competition_members;

CREATE POLICY "Users can join open competitions"
  ON competition_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = competition_id
        AND c.accepting_members = true
    )
  );

-- ============================================================
-- 3. assign_late_joiner(competition_id, user_id)
-- ============================================================
-- Called after a late-joiner successfully inserts into competition_members.
-- Generates driver_assignments for all non-completed races using a greedy
-- algorithm: for each race, pick a driver not already taken in that race
-- and not already assigned to the new player in a previous race.
--
-- SECURITY DEFINER bypasses the admin-only INSERT policy on driver_assignments.

CREATE OR REPLACE FUNCTION assign_late_joiner(
  p_competition_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  race_rec record;
  chosen_driver uuid;
  used_drivers uuid[] := '{}';
  assigned_count integer := 0;
BEGIN
  -- Only run if assignments already exist for this competition
  IF NOT EXISTS (
    SELECT 1 FROM driver_assignments
    WHERE competition_id = p_competition_id
    LIMIT 1
  ) THEN
    RETURN json_build_object('assigned', 0, 'message', 'No assignments exist yet');
  END IF;

  -- Loop through non-completed races in round order
  FOR race_rec IN (
    SELECT id
    FROM races
    WHERE season = 2026
      AND status != 'completed'
    ORDER BY round_number
  ) LOOP
    -- Pick a driver that:
    --   1. Belongs to the 2026 season
    --   2. Is NOT already assigned to another player in this race
    --   3. Has NOT been assigned to this new player in a previous race
    SELECT d.id INTO chosen_driver
    FROM drivers d
    WHERE d.season = 2026
      AND d.id NOT IN (
        SELECT da.driver_id
        FROM driver_assignments da
        WHERE da.race_id = race_rec.id
          AND da.competition_id = p_competition_id
      )
      AND d.id != ALL(used_drivers)
    ORDER BY d.id   -- deterministic ordering
    LIMIT 1;

    IF chosen_driver IS NULL THEN
      RAISE WARNING 'assign_late_joiner: no available driver for race %, skipping', race_rec.id;
      CONTINUE;
    END IF;

    INSERT INTO driver_assignments (competition_id, race_id, user_id, driver_id)
    VALUES (p_competition_id, race_rec.id, p_user_id, chosen_driver);

    used_drivers := array_append(used_drivers, chosen_driver);
    assigned_count := assigned_count + 1;
  END LOOP;

  RETURN json_build_object('assigned', assigned_count);
END;
$$;
