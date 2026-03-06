-- 012: Score calculation function + automatic result fetching via pg_cron + pg_net

-- ============================================================
-- 1. calculate_scores(race_id) — computes scores for every
--    player who has a prediction for the given race.
-- ============================================================
-- Joins predictions → driver_assignments → results, applies
-- the scoring rules, and upserts into the scores table.
--
-- Scoring (race):  exact=10, ±1=7, ±2=5, ±3=3, ±4=2, ±5=1
-- Scoring (sprint): exact=5, ±1=4, ±2=3, ±3=2, ±4=1
-- DNF drivers are treated as finishing P22.

CREATE OR REPLACE FUNCTION calculate_scores(p_race_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scores_count integer := 0;
BEGIN
  WITH scoring_data AS (
    SELECT
      p.user_id,
      p.race_id,
      p.competition_id,
      p.predicted_position_race,
      p.predicted_position_sprint,
      -- Resolve actual positions (DNF → 22)
      CASE WHEN res.is_dnf_race  THEN 22 ELSE res.finish_position_race  END AS actual_race,
      CASE WHEN res.is_dnf_sprint THEN 22 ELSE res.finish_position_sprint END AS actual_sprint
    FROM predictions p
    JOIN driver_assignments da
      ON  da.user_id        = p.user_id
      AND da.race_id         = p.race_id
      AND da.competition_id  = p.competition_id
    JOIN results res
      ON  res.race_id   = p.race_id
      AND res.driver_id = da.driver_id
    WHERE p.race_id = p_race_id
  ),
  scored AS (
    SELECT
      user_id, race_id, competition_id,

      -- Race points
      COALESCE(
        CASE WHEN predicted_position_race IS NOT NULL AND actual_race IS NOT NULL THEN
          CASE abs(predicted_position_race - actual_race)
            WHEN 0 THEN 10  WHEN 1 THEN 7  WHEN 2 THEN 5
            WHEN 3 THEN 3   WHEN 4 THEN 2  WHEN 5 THEN 1
            ELSE 0
          END
        END, 0
      ) AS race_points,

      -- Sprint points
      COALESCE(
        CASE WHEN predicted_position_sprint IS NOT NULL AND actual_sprint IS NOT NULL THEN
          CASE abs(predicted_position_sprint - actual_sprint)
            WHEN 0 THEN 5  WHEN 1 THEN 4  WHEN 2 THEN 3
            WHEN 3 THEN 2  WHEN 4 THEN 1
            ELSE 0
          END
        END, 0
      ) AS sprint_points,

      -- Position-off (nullable — NULL when no prediction / no result)
      CASE WHEN predicted_position_race IS NOT NULL AND actual_race IS NOT NULL
        THEN abs(predicted_position_race - actual_race) END AS race_position_off,

      CASE WHEN predicted_position_sprint IS NOT NULL AND actual_sprint IS NOT NULL
        THEN abs(predicted_position_sprint - actual_sprint) END AS sprint_position_off

    FROM scoring_data
  )
  INSERT INTO scores (
    user_id, race_id, competition_id,
    race_points, sprint_points, total_points,
    race_position_off, sprint_position_off
  )
  SELECT
    user_id, race_id, competition_id,
    race_points, sprint_points,
    race_points + sprint_points,
    race_position_off, sprint_position_off
  FROM scored
  ON CONFLICT (user_id, race_id, competition_id)
  DO UPDATE SET
    race_points       = EXCLUDED.race_points,
    sprint_points     = EXCLUDED.sprint_points,
    total_points      = EXCLUDED.total_points,
    race_position_off = EXCLUDED.race_position_off,
    sprint_position_off = EXCLUDED.sprint_position_off;

  GET DIAGNOSTICS scores_count = ROW_COUNT;

  RETURN json_build_object(
    'scores_calculated', scores_count,
    'race_id', p_race_id
  );
END;
$$;

-- ============================================================
-- 2. Enable pg_net extension (HTTP calls from Postgres)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- 3. invoke_fetch_results() — called by pg_cron
-- ============================================================
-- Checks if any race needs results (race_date passed, not completed).
-- If so, fires an async HTTP POST to the fetch-results edge function.
-- The edge function auto-detects which round to fetch.

CREATE OR REPLACE FUNCTION invoke_fetch_results()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_count integer;
  fn_url text;
  svc_key text;
BEGIN
  -- Quick gate: anything to do?
  SELECT count(*) INTO pending_count
  FROM races
  WHERE season = 2026
    AND status != 'completed'
    AND race_date <= current_date;

  IF pending_count = 0 THEN
    RETURN;
  END IF;

  -- Retrieve service role key from vault
  SELECT decrypted_secret INTO svc_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF svc_key IS NULL THEN
    RAISE WARNING 'invoke_fetch_results: service_role_key not found in vault, skipping';
    RETURN;
  END IF;

  fn_url := 'https://qtpzyroegkqbcqmnyvae.supabase.co/functions/v1/fetch-results';

  -- Fire-and-forget HTTP call via pg_net
  PERFORM net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body    := '{}'::jsonb
  );
END;
$$;

-- ============================================================
-- 4. Schedule the job — every hour at minute 5
-- ============================================================
-- Runs hourly. The function exits immediately when nothing is pending.
SELECT cron.schedule(
  'fetch-results',
  '5 * * * *',
  'SELECT invoke_fetch_results()'
);
