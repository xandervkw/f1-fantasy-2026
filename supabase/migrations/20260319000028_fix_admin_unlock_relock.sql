-- 028: Fix admin-unlocked predictions not re-locking at custom lock time
--
-- Bug: When admin unlocks predictions after qualifying (sets admin_race_unlocked=true)
-- and also sets a custom prediction_lock_time (e.g. 5min before race start),
-- the cron never re-locks because it skips all admin-unlocked races.
--
-- Fix: Add phases to lock_predictions() that handle admin-unlocked races
-- with an explicit prediction_lock_time / sprint_prediction_lock_time.
-- When that custom time passes, re-lock and clear the admin flag.

CREATE OR REPLACE FUNCTION lock_predictions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sprint_locked_count integer := 0;
  race_locked_count integer := 0;
  missed_count integer := 0;
  admin_race_relocked integer := 0;
  admin_sprint_relocked integer := 0;
BEGIN
  -- ---- Phase 1: Sprint lock (normal) ----
  UPDATE predictions p
  SET is_sprint_locked = true
  FROM races r
  WHERE p.race_id = r.id
    AND p.is_sprint_locked = false
    AND r.is_sprint_weekend = true
    AND r.admin_sprint_unlocked = false
    AND r.sprint_qualifying_time IS NOT NULL
    AND COALESCE(r.sprint_prediction_lock_time,
                 r.sprint_qualifying_time - interval '5 minutes') <= now();

  GET DIAGNOSTICS sprint_locked_count = ROW_COUNT;

  -- ---- Phase 2: Race lock (normal) ----
  UPDATE predictions p
  SET is_locked = true
  FROM races r
  WHERE p.race_id = r.id
    AND p.is_locked = false
    AND r.admin_race_unlocked = false
    AND COALESCE(r.prediction_lock_time,
                 r.qualifying_time - interval '5 minutes') <= now();

  GET DIAGNOSTICS race_locked_count = ROW_COUNT;

  -- ---- Phase 3: Re-lock admin-unlocked races at custom lock time ----
  -- If admin unlocked a race but set a custom prediction_lock_time,
  -- re-lock when that time passes and clear the admin flag.
  UPDATE predictions p
  SET is_locked = true
  FROM races r
  WHERE p.race_id = r.id
    AND p.is_locked = false
    AND r.admin_race_unlocked = true
    AND r.prediction_lock_time IS NOT NULL
    AND r.prediction_lock_time <= now();

  GET DIAGNOSTICS admin_race_relocked = ROW_COUNT;

  -- Clear the admin flag on those races so future runs skip them
  UPDATE races
  SET admin_race_unlocked = false
  WHERE admin_race_unlocked = true
    AND prediction_lock_time IS NOT NULL
    AND prediction_lock_time <= now();

  -- ---- Phase 4: Re-lock admin-unlocked sprints at custom lock time ----
  UPDATE predictions p
  SET is_sprint_locked = true
  FROM races r
  WHERE p.race_id = r.id
    AND p.is_sprint_locked = false
    AND r.admin_sprint_unlocked = true
    AND r.sprint_prediction_lock_time IS NOT NULL
    AND r.sprint_prediction_lock_time <= now();

  GET DIAGNOSTICS admin_sprint_relocked = ROW_COUNT;

  UPDATE races
  SET admin_sprint_unlocked = false
  WHERE admin_sprint_unlocked = true
    AND sprint_prediction_lock_time IS NOT NULL
    AND sprint_prediction_lock_time <= now();

  -- ---- Phase 5: Create missed predictions ----
  INSERT INTO predictions (user_id, race_id, competition_id, is_locked, is_sprint_locked, is_missed)
  SELECT
    da.user_id,
    da.race_id,
    da.competition_id,
    true,
    CASE WHEN r.is_sprint_weekend THEN true ELSE false END,
    true
  FROM driver_assignments da
  JOIN races r ON r.id = da.race_id
  WHERE r.admin_race_unlocked = false
    AND COALESCE(r.prediction_lock_time,
                 r.qualifying_time - interval '5 minutes') <= now()
    AND NOT EXISTS (
      SELECT 1 FROM predictions p
      WHERE p.user_id = da.user_id
        AND p.race_id = da.race_id
        AND p.competition_id = da.competition_id
    );

  GET DIAGNOSTICS missed_count = ROW_COUNT;

  RETURN json_build_object(
    'sprint_locked', sprint_locked_count,
    'race_locked', race_locked_count,
    'admin_race_relocked', admin_race_relocked,
    'admin_sprint_relocked', admin_sprint_relocked,
    'missed', missed_count,
    'executed_at', now()
  );
END;
$$;

-- Also fix the China race: clear the stale admin_race_unlocked flag
UPDATE races
SET admin_race_unlocked = false
WHERE round_number = 2 AND season = 2026;
