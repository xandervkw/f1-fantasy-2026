-- 024: Conditional admin unlock flag
--
-- Previously, unlock_race_predictions always set admin_race_unlocked = true,
-- which prevented the cron from ever re-locking. This meant admin unlocking
-- BEFORE the deadline would leave predictions open permanently.
--
-- New behaviour:
--   - Unlock BEFORE deadline: just reset is_locked/is_sprint_locked,
--     do NOT set the admin flag → cron will auto-lock at the deadline.
--   - Unlock AFTER deadline: set the admin flag → cron won't re-lock,
--     predictions stay open until admin manually locks again.

-- Drop first — CREATE OR REPLACE won't update the body reliably
DROP FUNCTION IF EXISTS unlock_race_predictions(uuid, uuid, text);

CREATE FUNCTION unlock_race_predictions(
  p_race_id uuid,
  p_competition_id uuid,
  p_type text DEFAULT 'both'  -- 'race', 'sprint', or 'both'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated integer := 0;
  v_race record;
  v_race_deadline timestamptz;
  v_sprint_deadline timestamptz;
BEGIN
  -- Look up the race to calculate deadlines
  SELECT * INTO v_race FROM races WHERE id = p_race_id;
  IF v_race IS NULL THEN
    RETURN json_build_object('error', 'Race not found');
  END IF;

  v_race_deadline := COALESCE(v_race.prediction_lock_time,
                               v_race.qualifying_time - interval '5 minutes');
  v_sprint_deadline := COALESCE(v_race.sprint_prediction_lock_time,
                                 v_race.sprint_qualifying_time - interval '5 minutes');

  -- Unlock race predictions
  IF p_type = 'race' OR p_type = 'both' THEN
    -- Only set admin flag if deadline already passed (prevents cron re-lock)
    -- Before deadline: let the timer/cron handle locking naturally
    IF now() >= v_race_deadline THEN
      UPDATE races SET admin_race_unlocked = true WHERE id = p_race_id;
    END IF;

    UPDATE predictions
    SET is_locked = false
    WHERE race_id = p_race_id
      AND competition_id = p_competition_id;
    GET DIAGNOSTICS updated = ROW_COUNT;
  END IF;

  -- Unlock sprint predictions
  IF p_type = 'sprint' OR p_type = 'both' THEN
    -- Only set admin flag if sprint deadline already passed
    IF v_sprint_deadline IS NOT NULL AND now() >= v_sprint_deadline THEN
      UPDATE races SET admin_sprint_unlocked = true WHERE id = p_race_id;
    END IF;

    UPDATE predictions
    SET is_sprint_locked = false
    WHERE race_id = p_race_id
      AND competition_id = p_competition_id;
  END IF;

  RETURN json_build_object('updated', updated, 'type', p_type);
END;
$$;
