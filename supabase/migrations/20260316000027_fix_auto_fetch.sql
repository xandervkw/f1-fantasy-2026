-- 027: Fix auto-fetch cron — replace edge function call with direct Postgres HTTP
--
-- Root cause: invoke_fetch_results() needed service_role_key from vault,
-- but the key was never inserted into the vault. The cron silently skipped
-- every hour.
--
-- New approach: use pgsql-http extension to call Jolpica API directly from
-- Postgres, parse the JSON, insert results, calculate scores, and advance
-- the race status — all in one function with no edge function dependency.

-- Enable the http extension for synchronous HTTP requests
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Replace the broken invoke_fetch_results with a self-contained function
CREATE OR REPLACE FUNCTION invoke_fetch_results()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_race record;
  v_resp extensions.http_response;
  v_race_json jsonb;
  v_sprint_json jsonb;
  v_results jsonb;
  v_sprint_results jsonb;
  v_result jsonb;
  v_driver_id uuid;
  v_code text;
  v_status text;
  v_is_dnf boolean;
  v_position int;
  v_inserted int := 0;
  v_scores json;
  v_next_race record;
BEGIN
  -- 1. Find race needing results (race_date passed, not completed)
  SELECT * INTO v_race
  FROM races
  WHERE season = 2026
    AND status != 'completed'
    AND race_date <= current_date
  ORDER BY round_number ASC
  LIMIT 1;

  IF v_race IS NULL THEN
    RETURN; -- nothing to do
  END IF;

  -- 2. Skip if results already stored
  IF EXISTS (SELECT 1 FROM results WHERE race_id = v_race.id LIMIT 1) THEN
    RETURN; -- results already exist
  END IF;

  -- 3. Fetch race results from Jolpica API
  SELECT * INTO v_resp
  FROM extensions.http_get(
    'https://api.jolpi.ca/ergast/f1/2026/' || v_race.round_number || '/results/'
  );

  IF v_resp.status != 200 THEN
    RAISE WARNING 'auto_fetch: Jolpica API returned status % for round %',
      v_resp.status, v_race.round_number;
    RETURN;
  END IF;

  v_race_json := v_resp.content::jsonb;
  v_results := v_race_json->'MRData'->'RaceTable'->'Races'->0->'Results';

  IF v_results IS NULL OR jsonb_array_length(v_results) = 0 THEN
    RAISE NOTICE 'auto_fetch: No race results yet for round %', v_race.round_number;
    RETURN;
  END IF;

  -- 4. Fetch sprint results if sprint weekend
  v_sprint_results := NULL;
  IF v_race.is_sprint_weekend THEN
    SELECT * INTO v_resp
    FROM extensions.http_get(
      'https://api.jolpi.ca/ergast/f1/2026/' || v_race.round_number || '/sprint/'
    );

    IF v_resp.status = 200 THEN
      v_sprint_json := v_resp.content::jsonb;
      v_sprint_results := v_sprint_json->'MRData'->'RaceTable'->'Races'->0->'SprintResults';
    END IF;
  END IF;

  -- 5. Insert race results
  FOR v_result IN SELECT * FROM jsonb_array_elements(v_results)
  LOOP
    v_code := v_result->'Driver'->>'code';
    v_status := v_result->>'status';
    v_position := (v_result->>'position')::int;
    -- DNF = not Finished, not lapped ("+N Lap"), not "Lapped"
    v_is_dnf := v_status != 'Finished'
      AND NOT v_status LIKE '+%'
      AND v_status != 'Lapped';

    SELECT id INTO v_driver_id
    FROM drivers
    WHERE abbreviation = v_code AND season = 2026;

    IF v_driver_id IS NULL THEN
      RAISE WARNING 'auto_fetch: unmatched driver code %', v_code;
      CONTINUE;
    END IF;

    INSERT INTO results (race_id, driver_id, finish_position_race, is_dnf_race)
    VALUES (v_race.id, v_driver_id, v_position, v_is_dnf)
    ON CONFLICT (race_id, driver_id) DO UPDATE SET
      finish_position_race = EXCLUDED.finish_position_race,
      is_dnf_race = EXCLUDED.is_dnf_race;

    v_inserted := v_inserted + 1;
  END LOOP;

  -- 6. Insert sprint results
  IF v_sprint_results IS NOT NULL AND jsonb_array_length(v_sprint_results) > 0 THEN
    FOR v_result IN SELECT * FROM jsonb_array_elements(v_sprint_results)
    LOOP
      v_code := v_result->'Driver'->>'code';
      v_status := v_result->>'status';
      v_position := (v_result->>'position')::int;
      v_is_dnf := v_status != 'Finished'
        AND NOT v_status LIKE '+%'
        AND v_status != 'Lapped';

      SELECT id INTO v_driver_id
      FROM drivers
      WHERE abbreviation = v_code AND season = 2026;

      IF v_driver_id IS NULL THEN
        CONTINUE;
      END IF;

      UPDATE results SET
        finish_position_sprint = v_position,
        is_dnf_sprint = v_is_dnf
      WHERE race_id = v_race.id AND driver_id = v_driver_id;

      -- If race result didn't exist yet, insert sprint-only
      IF NOT FOUND THEN
        INSERT INTO results (race_id, driver_id, finish_position_sprint, is_dnf_sprint)
        VALUES (v_race.id, v_driver_id, v_position, v_is_dnf)
        ON CONFLICT (race_id, driver_id) DO UPDATE SET
          finish_position_sprint = EXCLUDED.finish_position_sprint,
          is_dnf_sprint = EXCLUDED.is_dnf_sprint;
      END IF;
    END LOOP;
  END IF;

  IF v_inserted = 0 THEN
    RAISE WARNING 'auto_fetch: no results stored for round %', v_race.round_number;
    RETURN;
  END IF;

  RAISE NOTICE 'auto_fetch: stored % results for round % (%)',
    v_inserted, v_race.round_number, v_race.race_name;

  -- 7. Calculate scores
  v_scores := calculate_scores(v_race.id);
  RAISE NOTICE 'auto_fetch: scores = %', v_scores;

  -- 8. Mark race as completed
  UPDATE races SET status = 'completed' WHERE id = v_race.id;

  -- 9. Activate next upcoming race
  SELECT * INTO v_next_race
  FROM races
  WHERE season = 2026 AND status = 'upcoming'
  ORDER BY round_number ASC
  LIMIT 1;

  IF v_next_race IS NOT NULL THEN
    UPDATE races SET status = 'active' WHERE id = v_next_race.id;
    RAISE NOTICE 'auto_fetch: activated round % (%)',
      v_next_race.round_number, v_next_race.race_name;
  END IF;
END;
$$;

-- Cron schedule stays the same (every hour at :05)
-- No need to re-create it — it already calls invoke_fetch_results()
