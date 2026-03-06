-- 011: Lock predictions system
-- Adds sprint locking, configurable deadlines, lock function, and pg_cron schedule

-- ============================================================
-- 1. Add is_sprint_locked to predictions
-- ============================================================
ALTER TABLE predictions
  ADD COLUMN is_sprint_locked boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Add deadline override columns to races
-- ============================================================
-- NULL = use default (qualifying_time - 5 min / sprint_qualifying_time - 5 min)
-- Set a value to override (e.g. for Australia R1, set to race start - 5 min)
ALTER TABLE races
  ADD COLUMN prediction_lock_time timestamptz,
  ADD COLUMN sprint_prediction_lock_time timestamptz;

-- ============================================================
-- 3. Trigger: prevent sprint prediction changes when sprint-locked
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_sprint_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If sprint is already locked, prevent any change to the sprint prediction
  IF OLD.is_sprint_locked = true
     AND (NEW.predicted_position_sprint IS DISTINCT FROM OLD.predicted_position_sprint)
  THEN
    RAISE EXCEPTION 'Sprint prediction is locked and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_sprint_lock
  BEFORE UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sprint_change();

-- ============================================================
-- 4. lock_predictions() function
-- ============================================================
-- Called every minute by pg_cron. Also callable via Edge Function.
-- Two-phase locking: sprint first, then race.
CREATE OR REPLACE FUNCTION lock_predictions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sprint_locked_count integer := 0;
  race_locked_count integer := 0;
  missed_count integer := 0;
BEGIN
  -- ---- Phase 1: Sprint lock ----
  -- Lock sprint predictions for races where sprint deadline has passed
  UPDATE predictions p
  SET is_sprint_locked = true
  FROM races r
  WHERE p.race_id = r.id
    AND p.is_sprint_locked = false
    AND r.is_sprint_weekend = true
    AND r.sprint_qualifying_time IS NOT NULL
    AND COALESCE(r.sprint_prediction_lock_time,
                 r.sprint_qualifying_time - interval '5 minutes') <= now();

  GET DIAGNOSTICS sprint_locked_count = ROW_COUNT;

  -- ---- Phase 2: Race lock ----
  -- Lock entire prediction row for races where race deadline has passed
  UPDATE predictions p
  SET is_locked = true
  FROM races r
  WHERE p.race_id = r.id
    AND p.is_locked = false
    AND COALESCE(r.prediction_lock_time,
                 r.qualifying_time - interval '5 minutes') <= now();

  GET DIAGNOSTICS race_locked_count = ROW_COUNT;

  -- ---- Phase 3: Create missed predictions ----
  -- For players who have a driver_assignment but no prediction row at all,
  -- and the race deadline has passed.
  INSERT INTO predictions (user_id, race_id, competition_id, is_locked, is_sprint_locked, is_missed)
  SELECT
    da.user_id,
    da.race_id,
    da.competition_id,
    true,   -- is_locked
    CASE WHEN r.is_sprint_weekend THEN true ELSE false END,  -- is_sprint_locked
    true    -- is_missed
  FROM driver_assignments da
  JOIN races r ON r.id = da.race_id
  WHERE COALESCE(r.prediction_lock_time,
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
    'missed', missed_count,
    'executed_at', now()
  );
END;
$$;

-- ============================================================
-- 5. Enable pg_cron and schedule the job
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'lock-predictions',
  '* * * * *',
  'SELECT lock_predictions()'
);
