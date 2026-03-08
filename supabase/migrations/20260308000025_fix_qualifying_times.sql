-- 025: Fix qualifying times to actual UTC session start times
--
-- All qualifying_time values were seeded as placeholder 14:00 UTC.
-- This migration corrects them to actual qualifying start times (UTC)
-- sourced from f1calendar.com and cross-referenced with formula1.com.
--
-- Also fixes:
--   - Bahrain/Saudi Arabia dates (were March, should be April)
--   - Bahrain incorrectly marked as sprint weekend
--   - Sprint qualifying times (were 14:00 placeholders)

-- Round 1: Australia — 05:00 UTC (16:00 AEDT)
UPDATE races SET qualifying_time = '2026-03-07T05:00:00Z'
  WHERE round_number = 1 AND season = 2026;

-- Round 2: China (sprint) — Q 07:00 UTC (15:00 CST), SQ 07:30 UTC
UPDATE races SET
  qualifying_time = '2026-03-14T07:00:00Z',
  sprint_qualifying_time = '2026-03-13T07:30:00Z'
  WHERE round_number = 2 AND season = 2026;

-- Round 3: Japan — 06:00 UTC (15:00 JST)
UPDATE races SET qualifying_time = '2026-03-28T06:00:00Z'
  WHERE round_number = 3 AND season = 2026;

-- Round 4: Bahrain — fix date (was March) + not a sprint weekend
UPDATE races SET
  qualifying_time = '2026-04-11T16:00:00Z',
  sprint_qualifying_time = NULL,
  is_sprint_weekend = false
  WHERE round_number = 4 AND season = 2026;

-- Round 5: Saudi Arabia — fix date (was March), 17:00 UTC (20:00 AST)
UPDATE races SET qualifying_time = '2026-04-18T17:00:00Z'
  WHERE round_number = 5 AND season = 2026;

-- Round 6: Miami (sprint) — Q 20:00 UTC (16:00 EDT), SQ 20:30 UTC
UPDATE races SET
  qualifying_time = '2026-05-02T20:00:00Z',
  sprint_qualifying_time = '2026-05-01T20:30:00Z'
  WHERE round_number = 6 AND season = 2026;

-- Round 7: Canada (sprint) — Q 20:00 UTC (16:00 EDT), SQ 20:30 UTC
UPDATE races SET
  qualifying_time = '2026-05-23T20:00:00Z',
  sprint_qualifying_time = '2026-05-22T20:30:00Z'
  WHERE round_number = 7 AND season = 2026;

-- Rounds 8-10: Monaco, Barcelona, Austria — 14:00 UTC is correct, no change

-- Round 11: Great Britain (sprint) — Q 15:00 UTC (16:00 BST), SQ 15:30 UTC
UPDATE races SET
  qualifying_time = '2026-07-04T15:00:00Z',
  sprint_qualifying_time = '2026-07-03T15:30:00Z'
  WHERE round_number = 11 AND season = 2026;

-- Rounds 12-13: Belgium, Hungary — 14:00 UTC is correct, no change

-- Round 14: Netherlands (sprint) — Q 14:00 UTC correct, SQ 14:30 UTC
UPDATE races SET
  sprint_qualifying_time = '2026-08-21T14:30:00Z'
  WHERE round_number = 14 AND season = 2026;

-- Rounds 15-16: Italy, Madrid — 14:00 UTC is correct, no change

-- Round 17: Azerbaijan — 12:00 UTC (16:00 AZT), quali on Friday (Sat race)
UPDATE races SET qualifying_time = '2026-09-25T12:00:00Z'
  WHERE round_number = 17 AND season = 2026;

-- Round 18: Singapore (sprint) — Q 13:00 UTC (21:00 SGT), SQ 12:30 UTC
UPDATE races SET
  qualifying_time = '2026-10-10T13:00:00Z',
  sprint_qualifying_time = '2026-10-09T12:30:00Z'
  WHERE round_number = 18 AND season = 2026;

-- Round 19: United States (Austin) — 21:00 UTC (16:00 CDT)
UPDATE races SET qualifying_time = '2026-10-24T21:00:00Z'
  WHERE round_number = 19 AND season = 2026;

-- Round 20: Mexico City — 21:00 UTC (15:00 CST)
UPDATE races SET qualifying_time = '2026-10-31T21:00:00Z'
  WHERE round_number = 20 AND season = 2026;

-- Round 21: Sao Paulo — 18:00 UTC (15:00 BRT)
UPDATE races SET qualifying_time = '2026-11-07T18:00:00Z'
  WHERE round_number = 21 AND season = 2026;

-- Round 22: Las Vegas — 04:00 UTC Sat (20:00 PST Fri night)
UPDATE races SET qualifying_time = '2026-11-21T04:00:00Z'
  WHERE round_number = 22 AND season = 2026;

-- Round 23: Qatar — 18:00 UTC (21:00 AST)
UPDATE races SET qualifying_time = '2026-11-28T18:00:00Z'
  WHERE round_number = 23 AND season = 2026;

-- Round 24: Abu Dhabi — 14:00 UTC is correct, no change
