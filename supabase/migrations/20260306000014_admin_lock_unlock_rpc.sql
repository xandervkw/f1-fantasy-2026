-- 014: Admin lock/unlock system
-- 1. Add admin_unlocked flag on races so cron respects admin overrides
-- 2. SECURITY DEFINER RPCs for admin lock/unlock (bypasses RLS)
-- 3. Update lock_predictions() cron function to skip admin-unlocked races

-- ============================================================
-- 1. Add admin_unlocked columns to races
-- ============================================================
ALTER TABLE races
  ADD COLUMN admin_race_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN admin_sprint_unlocked boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. lock_race_predictions(race_id, competition_id, is_sprint)
-- ============================================================
CREATE OR REPLACE FUNCTION lock_race_predictions(
  p_race_id uuid,
  p_competition_id uuid,
  p_is_sprint_weekend boolean DEFAULT false
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
  -- Clear admin unlock flag
  UPDATE races
  SET admin_race_unlocked = false,
      admin_sprint_unlocked = false
  WHERE id = p_race_id;

  -- Lock race predictions
  UPDATE predictions
  SET is_locked = true
  WHERE race_id = p_race_id
    AND competition_id = p_competition_id
    AND is_locked = false;
  GET DIAGNOSTICS race_locked = ROW_COUNT;

  -- Lock sprint predictions if sprint weekend
  IF p_is_sprint_weekend THEN
    UPDATE predictions
    SET is_sprint_locked = true
    WHERE race_id = p_race_id
      AND competition_id = p_competition_id
      AND is_sprint_locked = false;
    GET DIAGNOSTICS sprint_locked = ROW_COUNT;
  END IF;

  -- Create missed prediction rows
  INSERT INTO predictions (user_id, race_id, competition_id, is_locked, is_sprint_locked, is_missed)
  SELECT
    da.user_id,
    da.race_id,
    da.competition_id,
    true,
    p_is_sprint_weekend,
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

  RETURN json_build_object(
    'race_locked', race_locked,
    'sprint_locked', sprint_locked,
    'missed', missed
  );
END;
$$;

-- ============================================================
-- 3. unlock_race_predictions(race_id, competition_id, type)
-- ============================================================
CREATE OR REPLACE FUNCTION unlock_race_predictions(
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
BEGIN
  -- Set admin unlock flag so cron doesn't re-lock
  IF p_type = 'race' OR p_type = 'both' THEN
    UPDATE races SET admin_race_unlocked = true WHERE id = p_race_id;

    UPDATE predictions
    SET is_locked = false
    WHERE race_id = p_race_id
      AND competition_id = p_competition_id;
    GET DIAGNOSTICS updated = ROW_COUNT;
  END IF;

  IF p_type = 'sprint' OR p_type = 'both' THEN
    UPDATE races SET admin_sprint_unlocked = true WHERE id = p_race_id;

    UPDATE predictions
    SET is_sprint_locked = false
    WHERE race_id = p_race_id
      AND competition_id = p_competition_id;
  END IF;

  RETURN json_build_object('updated', updated, 'type', p_type);
END;
$$;

-- ============================================================
-- 4. Update lock_predictions() to respect admin unlock flags
-- ============================================================
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
  UPDATE predictions p
  SET is_sprint_locked = true
  FROM races r
  WHERE p.race_id = r.id
    AND p.is_sprint_locked = false
    AND r.is_sprint_weekend = true
    AND r.admin_sprint_unlocked = false          -- respect admin override
    AND r.sprint_qualifying_time IS NOT NULL
    AND COALESCE(r.sprint_prediction_lock_time,
                 r.sprint_qualifying_time - interval '5 minutes') <= now();

  GET DIAGNOSTICS sprint_locked_count = ROW_COUNT;

  -- ---- Phase 2: Race lock ----
  UPDATE predictions p
  SET is_locked = true
  FROM races r
  WHERE p.race_id = r.id
    AND p.is_locked = false
    AND r.admin_race_unlocked = false            -- respect admin override
    AND COALESCE(r.prediction_lock_time,
                 r.qualifying_time - interval '5 minutes') <= now();

  GET DIAGNOSTICS race_locked_count = ROW_COUNT;

  -- ---- Phase 3: Create missed predictions ----
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
  WHERE r.admin_race_unlocked = false            -- respect admin override
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
    'missed', missed_count,
    'executed_at', now()
  );
END;
$$;
