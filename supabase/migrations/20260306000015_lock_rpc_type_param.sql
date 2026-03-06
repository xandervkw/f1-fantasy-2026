-- 015: Update lock_race_predictions to accept p_type parameter
-- Allows locking race/sprint independently (matching unlock_race_predictions)

CREATE OR REPLACE FUNCTION lock_race_predictions(
  p_race_id uuid,
  p_competition_id uuid,
  p_type text DEFAULT 'both'  -- 'race', 'sprint', or 'both'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  race_locked integer := 0;
  sprint_locked integer := 0;
  missed integer := 0;
BEGIN
  -- Lock race predictions
  IF p_type = 'race' OR p_type = 'both' THEN
    UPDATE races SET admin_race_unlocked = false WHERE id = p_race_id;

    UPDATE predictions
    SET is_locked = true
    WHERE race_id = p_race_id
      AND competition_id = p_competition_id
      AND is_locked = false;
    GET DIAGNOSTICS race_locked = ROW_COUNT;
  END IF;

  -- Lock sprint predictions
  IF p_type = 'sprint' OR p_type = 'both' THEN
    UPDATE races SET admin_sprint_unlocked = false WHERE id = p_race_id;

    UPDATE predictions
    SET is_sprint_locked = true
    WHERE race_id = p_race_id
      AND competition_id = p_competition_id
      AND is_sprint_locked = false;
    GET DIAGNOSTICS sprint_locked = ROW_COUNT;
  END IF;

  -- Create missed prediction rows (only when locking race or both)
  IF p_type = 'race' OR p_type = 'both' THEN
    INSERT INTO predictions (user_id, race_id, competition_id, is_locked, is_sprint_locked, is_missed)
    SELECT
      da.user_id,
      da.race_id,
      da.competition_id,
      true,
      CASE WHEN p_type = 'both' THEN true ELSE false END,
      true
    FROM driver_assignments da
    WHERE da.race_id = p_race_id
      AND da.competition_id = p_competition_id
      AND NOT EXISTS (
        SELECT 1 FROM predictions p
        WHERE p.user_id = da.user_id
          AND p.race_id = da.race_id
          AND p.competition_id = da.competition_id
      );
    GET DIAGNOSTICS missed = ROW_COUNT;
  END IF;

  RETURN json_build_object(
    'race_locked', race_locked,
    'sprint_locked', sprint_locked,
    'missed', missed,
    'type', p_type
  );
END;
$$;
