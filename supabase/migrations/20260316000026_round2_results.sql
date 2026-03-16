-- Auto-generated: Insert Round 2 (China) results into production
-- Race + Sprint results from Jolpica API

DO $$
DECLARE
  v_race_id uuid;
  v_driver_id uuid;
  v_result json;
BEGIN
  -- Get round 2 race ID
  SELECT id INTO v_race_id FROM races WHERE round_number = 2 AND season = 2026;
  IF v_race_id IS NULL THEN
    RAISE EXCEPTION 'Round 2 not found';
  END IF;

  -- ALB: Race P22 DNF, Sprint P16 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'ALB' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 22, 16, true, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- ALO: Race P17 DNF, Sprint P17 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'ALO' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 17, 17, true, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- ANT: Race P1 , Sprint P5 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'ANT' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 1, 5, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- BEA: Race P5 , Sprint P8 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'BEA' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 5, 8, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- BOR: Race P21 DNF, Sprint P13 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'BOR' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 21, 13, true, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- BOT: Race P13 , Sprint P21 DNF
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'BOT' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 13, 21, false, true)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- COL: Race P10 , Sprint P14 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'COL' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 10, 14, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- GAS: Race P6 , Sprint P11 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'GAS' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 6, 11, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- HAD: Race P8 , Sprint P15 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'HAD' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 8, 15, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- HAM: Race P3 , Sprint P3 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'HAM' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 3, 3, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- HUL: Race P11 , Sprint P20 DNF
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'HUL' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 11, 20, false, true)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- LAW: Race P7 , Sprint P7 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'LAW' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 7, 7, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- LEC: Race P4 , Sprint P2 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'LEC' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 4, 2, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- LIN: Race P12 , Sprint P22 DNF
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'LIN' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 12, 22, false, true)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- NOR: Race P20 DNF, Sprint P4 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'NOR' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 20, 4, true, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- OCO: Race P14 , Sprint P10 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'OCO' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 14, 10, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- PER: Race P15 , Sprint P19 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'PER' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 15, 19, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- PIA: Race P19 DNF, Sprint P6 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'PIA' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 19, 6, true, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- RUS: Race P2 , Sprint P1 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'RUS' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 2, 1, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- SAI: Race P9 , Sprint P12 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'SAI' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 9, 12, false, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- STR: Race P18 DNF, Sprint P18 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'STR' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 18, 18, true, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- VER: Race P16 DNF, Sprint P9 
  SELECT id INTO v_driver_id FROM drivers WHERE abbreviation = 'VER' AND season = 2026;
  INSERT INTO results (race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint)
  VALUES (v_race_id, v_driver_id, 16, 9, true, false)
  ON CONFLICT (race_id, driver_id) DO UPDATE SET
    finish_position_race = EXCLUDED.finish_position_race,
    finish_position_sprint = EXCLUDED.finish_position_sprint,
    is_dnf_race = EXCLUDED.is_dnf_race,
    is_dnf_sprint = EXCLUDED.is_dnf_sprint;

  -- Calculate scores for round 2
  SELECT calculate_scores(v_race_id) INTO v_result;
  RAISE NOTICE 'Scores result: %', v_result;

  -- Ensure round 2 is marked completed
  UPDATE races SET status = 'completed' WHERE id = v_race_id;

END;
$$;
