-- 029: Remove cancelled Bahrain (R4) and Saudi Arabia (R5) races
--
-- Calendar drops from 24 to 22 races. The Latin square rotation already
-- covers exactly 22 rounds, so all remaining races get assignments.
-- No draft needed for the final 2 races.
--
-- Strategy:
-- 1. Remap assignments from R4-R22 to point to races 2 positions later,
--    processing from highest round to lowest to avoid unique constraint violations
-- 2. Delete Bahrain and Saudi Arabia (CASCADE cleans up their predictions)
-- 3. Renumber remaining races: R6→R4, R7→R5, ..., R24→R22

-- ============================================================
-- Step 1: Remap driver_assignments from rounds 22 down to 4
-- Each assignment's race_id shifts to the race 2 rounds later.
-- Process in reverse order (R22→R24 first, then R21→R23, etc.)
-- to avoid unique constraint violations.
-- ============================================================

DO $$
DECLARE
  v_round integer;
  v_old_race_id uuid;
  v_new_race_id uuid;
  v_updated integer;
BEGIN
  FOR v_round IN REVERSE 22..4 LOOP
    SELECT id INTO v_old_race_id FROM races WHERE season = 2026 AND round_number = v_round;
    SELECT id INTO v_new_race_id FROM races WHERE season = 2026 AND round_number = v_round + 2;

    IF v_old_race_id IS NULL OR v_new_race_id IS NULL THEN
      RAISE EXCEPTION 'Missing race for round % or %', v_round, v_round + 2;
    END IF;

    UPDATE driver_assignments
    SET race_id = v_new_race_id
    WHERE race_id = v_old_race_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Remapped R% → R%: % assignments', v_round, v_round + 2, v_updated;
  END LOOP;
END $$;

-- ============================================================
-- Step 2: Delete cancelled races (CASCADE deletes their predictions)
-- ============================================================
DELETE FROM races WHERE season = 2026 AND round_number IN (4, 5);

-- ============================================================
-- Step 3: Renumber remaining races R6-R24 → R4-R22
-- Process from lowest to highest to avoid unique constraint on (season, round_number)
-- ============================================================
DO $$
DECLARE
  v_round integer;
BEGIN
  FOR v_round IN 6..24 LOOP
    UPDATE races
    SET round_number = v_round - 2
    WHERE season = 2026 AND round_number = v_round;
  END LOOP;
END $$;

-- ============================================================
-- Step 4: Verify final state
-- ============================================================
DO $$
DECLARE
  race_count integer;
  max_round integer;
  min_round integer;
  assignment_count integer;
BEGIN
  SELECT count(*), min(round_number), max(round_number)
  INTO race_count, min_round, max_round
  FROM races WHERE season = 2026;

  IF race_count != 22 THEN
    RAISE EXCEPTION 'Expected 22 races, got %', race_count;
  END IF;

  IF min_round != 1 OR max_round != 22 THEN
    RAISE EXCEPTION 'Expected rounds 1-22, got %-% ', min_round, max_round;
  END IF;

  SELECT count(*) INTO assignment_count
  FROM driver_assignments da
  JOIN races r ON r.id = da.race_id
  WHERE r.season = 2026;

  IF assignment_count != 242 THEN
    RAISE EXCEPTION 'Expected 242 assignments (11 players x 22 races), got %', assignment_count;
  END IF;

  RAISE NOTICE 'Verification passed: 22 races (R1-R22), 242 assignments';
END $$;
